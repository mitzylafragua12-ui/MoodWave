import { createClient, FunctionsHttpError, type PostgrestError } from '@supabase/supabase-js';
import type { Api } from './types';
import type {
  ActivityKey, Assignment, Badge, CompletionResult, DetectionResult, DetectionRow, EarnedBadge, EmotionKey, HistoryItem,
  LedgerEntry, MenteeDetail, MenteeRow, MyMentorship, Profile, RoleKey,
} from '../types';
import { ACTIVITY_BY_ID, EMOTIONS, ROLES } from '../catalog';

const emotionById = Object.fromEntries(EMOTIONS.map((e) => [e.id, e.key])) as Record<number, EmotionKey>;
const emotionId = (k: EmotionKey) => EMOTIONS.find((e) => e.key === k)!.id;
const roleById = Object.fromEntries(ROLES.map((r) => [r.id, r.key])) as Record<number, RoleKey>;

function check<T>(res: { data: T; error: PostgrestError | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export function createSupabaseApi(url: string, anonKey: string): Api {
  const sb = createClient(url, anonKey);

  const uid = async () => {
    const { data } = await sb.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error('No autenticado');
    return id;
  };

  return {
    mode: 'supabase',

    async getUserId() {
      const { data } = await sb.auth.getSession();
      return data.session?.user.id ?? null;
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, session) => cb(session?.user.id ?? null));
      return () => data.subscription.unsubscribe();
    },
    async signUp(email, password, username) {
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { username, display_name: username }, emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
      });
      if (error) throw new Error(error.message);
      return { needsConfirmation: !data.session };
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : error.message);
    },
    async signInGuest() {
      const { error } = await sb.auth.signInAnonymously();
      if (error) throw new Error('El acceso de visitante no está habilitado en Supabase (Auth → Anonymous sign-ins).');
    },
    async signOut() { await sb.auth.signOut(); },
    async resetPassword(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + import.meta.env.BASE_URL });
      if (error) throw new Error(error.message);
    },

    async faceLogin(descriptor) {
      const { data, error } = await sb.functions.invoke<{ token_hash: string }>('face-login', { body: { descriptor } });
      if (error) {
        let msg = 'No se pudo verificar tu rostro. Intenta de nuevo o entra con contraseña.';
        if (error instanceof FunctionsHttpError) {
          try { msg = (await error.context.json()).error ?? msg; } catch { /* sin cuerpo */ }
        }
        throw new Error(msg);
      }
      if (!data?.token_hash) throw new Error('Respuesta inválida del servidor');
      const { error: e2 } = await sb.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
      if (e2) throw new Error('No se pudo abrir la sesión: ' + e2.message);
    },
    async getFaceStatus() {
      const rows = check(await sb.from('face_templates').select('updated_at').eq('user_id', await uid())) as { updated_at: string }[];
      return { enrolled: rows.length > 0, updated_at: rows[0]?.updated_at ?? null };
    },
    async enrollFace(descriptor) {
      check(await sb.rpc('enroll_face', { p_descriptor: descriptor }));
    },
    async deleteFace() { check(await sb.rpc('delete_face')); },

    async getProfile() {
      await sb.rpc('refresh_streak');
      const row = check(await sb.from('users').select('*').eq('id', await uid()).single()) as Record<string, unknown>;
      return { ...(row as unknown as Profile), role: roleById[row.role_id as number] };
    },
    async updateProfile(patch) {
      check(await sb.from('users').update(patch).eq('id', await uid()));
    },

    async getBadges() {
      return check(await sb.from('badges').select('*').order('id')) as Badge[];
    },
    async getPlaylists() {
      const rows = check(await sb.from('emotion_playlists').select('*')) as { emotion_id: number; spotify_playlist_id: string; title: string }[];
      return rows.map((r) => ({ emotion: emotionById[r.emotion_id], spotify_playlist_id: r.spotify_playlist_id, title: r.title }));
    },
    async updatePlaylist(emotion, spotifyId, title) {
      const res = await sb.from('emotion_playlists')
        .update({ spotify_playlist_id: spotifyId, title, curated_by: await uid(), updated_at: new Date().toISOString() })
        .eq('emotion_id', emotionId(emotion)).select();
      if (!check(res)?.length) throw new Error('Permiso denegado');
    },
    async getRecommendations(emotion) {
      const rows = check(await sb.rpc('recommend_activities', { p_emotion_key: emotion })) as
        { activity_key: ActivityKey; priority: number; reason: string }[];
      return rows.map((r) => ({ activity: r.activity_key, priority: r.priority, reason: r.reason }));
    },

    async recordDetection(emotion, confidence, scores, source) {
      return check(await sb.rpc('record_detection', {
        p_emotion_key: emotion, p_confidence: Number(confidence.toFixed(4)), p_scores: scores, p_source: source,
      })) as DetectionResult;
    },
    async assignActivity(activity, detectionId) {
      return check(await sb.rpc('assign_activity', { p_activity_key: activity, p_detection_id: detectionId ?? null })) as string;
    },
    async getAssignment(id) {
      const row = check(await sb.from('activity_assignments')
        .select('id, activity_id, detection_id, reason, detections(emotion_id), activity_completions(id)')
        .eq('id', id).single()) as unknown as {
          id: string; activity_id: number; detection_id: string | null; reason: Assignment['reason'];
          detections: { emotion_id: number } | null; activity_completions: { id: string }[] | { id: string } | null;
        };
      const comp = row.activity_completions;
      return {
        id: row.id,
        activity: ACTIVITY_BY_ID[row.activity_id].key,
        detection_id: row.detection_id,
        emotion: row.detections ? emotionById[row.detections.emotion_id] : null,
        reason: row.reason,
        completed: Array.isArray(comp) ? comp.length > 0 : !!comp,
      };
    },
    async completeActivity(assignmentId, input) {
      return check(await sb.rpc('complete_activity', {
        p_assignment_id: assignmentId,
        p_duration_seconds: Math.round(input.durationSeconds),
        p_score: input.score ?? null,
        p_journal_text: input.journalText ?? null,
        p_journal_prompt: input.journalPrompt ?? null,
        p_game: input.game ?? null,
      })) as CompletionResult;
    },

    async getDetections(sinceDays) {
      const since = new Date(Date.now() - sinceDays * 86400_000).toISOString();
      const rows = check(await sb.from('detections').select('id, emotion_id, confidence, source, created_at')
        .gte('created_at', since).order('created_at', { ascending: false })) as
        { id: string; emotion_id: number; confidence: number; source: DetectionRow['source']; created_at: string }[];
      return rows.map((r) => ({ id: r.id, emotion: emotionById[r.emotion_id], confidence: Number(r.confidence), source: r.source, created_at: r.created_at }));
    },
    async getHistory(limit) {
      const rows = check(await sb.from('activity_assignments')
        .select('id, activity_id, reason, created_at, detections(emotion_id, confidence), activity_completions(created_at, duration_seconds)')
        .order('created_at', { ascending: false }).limit(limit)) as unknown as {
          id: string; activity_id: number; reason: HistoryItem['reason']; created_at: string;
          detections: { emotion_id: number; confidence: number } | null;
          activity_completions: { created_at: string; duration_seconds: number }[] | { created_at: string; duration_seconds: number } | null;
        }[];
      return rows.map((r) => {
        const c = Array.isArray(r.activity_completions) ? r.activity_completions[0] : r.activity_completions;
        return {
          assignment_id: r.id,
          activity: ACTIVITY_BY_ID[r.activity_id].key,
          reason: r.reason,
          assigned_at: r.created_at,
          emotion: r.detections ? emotionById[r.detections.emotion_id] : null,
          confidence: r.detections ? Number(r.detections.confidence) : null,
          completed_at: c?.created_at ?? null,
          duration_seconds: c?.duration_seconds ?? null,
        };
      });
    },
    async getLedger(limit) {
      return (check(await sb.from('xp_ledger').select('id, amount, reason, note, created_at')
        .order('created_at', { ascending: false }).limit(limit)) ?? []) as LedgerEntry[];
    },
    async getMyBadges() {
      return (check(await sb.from('user_badges').select('badge_id, earned_at')) ?? []) as EarnedBadge[];
    },
    async getActivityCounts() {
      const rows = check(await sb.from('activity_completions').select('activity_assignments(activity_id)')) as unknown as
        { activity_assignments: { activity_id: number } | null }[];
      const out = { minigame: 0, journaling: 0, meditation: 0, music: 0 } as Record<ActivityKey, number>;
      for (const r of rows) if (r.activity_assignments) out[ACTIVITY_BY_ID[r.activity_assignments.activity_id].key]++;
      return out;
    },
    async getJournal() {
      const rows = check(await sb.from('journal_entries').select('id, emotion_id, prompt, content, created_at')
        .order('created_at', { ascending: false })) as
        { id: string; emotion_id: number | null; prompt: string; content: string; created_at: string }[];
      return rows.map((r) => ({ ...r, emotion: r.emotion_id ? emotionById[r.emotion_id] : null }));
    },
    async deleteJournal(id) { check(await sb.from('journal_entries').delete().eq('id', id)); },
    async getLeaderboard() { return check(await sb.rpc('get_leaderboard', { p_limit: 50 })); },

    async listMentorSessions() { return check(await sb.rpc('list_mentor_sessions')); },
    async requestMentorSession(topic) {
      check(await sb.from('mentor_sessions').insert({ mentee_id: await uid(), topic }));
    },
    async cancelMentorSession(id) {
      check(await sb.from('mentor_sessions').update({ status: 'cancelled' }).eq('id', id));
    },
    async claimMentorSession(id) { check(await sb.rpc('mentor_claim_session', { p_session: id })); },
    async completeMentorSession(id, feedback, notes) {
      check(await sb.rpc('mentor_complete_session', { p_session: id, p_feedback: feedback, p_notes: notes }));
    },

    async getMyMentorship() { return check(await sb.rpc('my_mentorship')) as MyMentorship; },
    async setMentorConsent(allowed) { check(await sb.rpc('set_mentor_consent', { p_allowed: allowed })); },
    async listMentees() {
      const rows = (check(await sb.rpc('mentor_list_mentees')) ?? []) as MenteeRow[];
      return rows.map((r) => ({ ...r, last_emotion: r.last_emotion as EmotionKey | null }));
    },
    async getMentee(userId) {
      const d = check(await sb.rpc('mentor_get_mentee', { p_user: userId })) as MenteeDetail;
      return { ...d, detections: d.detections.map((x) => ({ ...x, confidence: Number(x.confidence) })),
        history: d.history.map((h) => ({ ...h, confidence: h.confidence == null ? null : Number(h.confidence) })) };
    },
    async setMentor(userId, mentorId) { check(await sb.rpc('admin_set_mentor', { p_user: userId, p_mentor: mentorId })); },

    async createReport(r) {
      check(await sb.from('reports').insert({ ...r, reporter_id: await uid() }));
    },
    async listReports() { return check(await sb.rpc('mod_list_reports')); },
    async resolveReport(id, status, resolution) {
      check(await sb.rpc('mod_resolve_report', { p_report: id, p_status: status, p_resolution: resolution }));
    },
    async setSuspended(userId, suspended) {
      check(await sb.rpc('mod_set_suspended', { p_user: userId, p_suspended: suspended }));
    },

    async listUsers() { return check(await sb.rpc('admin_list_users')); },
    async adminDeleteFace(userId) { check(await sb.rpc('admin_delete_face', { p_user: userId })); },
    async setRole(userId, role) { check(await sb.rpc('admin_set_role', { p_user: userId, p_role_key: role })); },
    async saveBadge(b) {
      const { id, ...rest } = b;
      check(id ? await sb.from('badges').update(rest).eq('id', id) : await sb.from('badges').insert(rest));
    },
    async deleteBadge(id) { check(await sb.from('badges').delete().eq('id', id)); },
    async getAnalytics(days) { return check(await sb.rpc('get_analytics', { p_days: days })); },
  };
}

