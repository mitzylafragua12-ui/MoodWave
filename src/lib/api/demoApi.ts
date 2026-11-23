/**
 * Backend DEMO: replica en el navegador (localStorage) las mismas reglas que las
 * funciones SQL de Supabase. Permite probar MoodWave sin configurar nada.
 * Los datos solo viven en este navegador.
 */
import type { Api } from './types';
import type {
  ActivityKey, AdminUser, Analytics, Badge, CompletionResult, DetectionResult, EmotionKey, HistoryItem,
  JournalEntry, LedgerEntry, MentorSession, Playlist, Profile, Report, RoleKey,
} from '../types';
import { ACTIVITIES, ACTIVITY_BY_KEY, DEFAULT_BADGES, DEFAULT_PLAYLISTS, EMOTIONS, RECOMMENDATIONS, can, canSuspend, isAdminRole, type Perm } from '../catalog';
import { DAILY_CHECKIN_XP, cappedGrant, effectiveStreak, levelForXp, nextStreak, type BadgeStats, badgeValue } from '../gamification';
import { localDay } from '../date';
import { FACE_THRESHOLD, isValidDescriptor, matchFace } from '../faceAuth';

const STORAGE_KEY = 'moodwave-demo-db-v2';
export const DEMO_PASSWORD = 'moodwave123';

interface UserRow extends Profile { email: string; password_hash: string }
interface DetectionRec { id: string; user_id: string; emotion: EmotionKey; confidence: number; scores: Record<string, number>; source: 'camera' | 'manual'; created_at: string }
interface AssignmentRec { id: string; user_id: string; detection_id: string | null; activity: ActivityKey; reason: HistoryItem['reason']; created_at: string }
interface CompletionRec { id: string; assignment_id: string; user_id: string; duration_seconds: number; score: number | null; game_key?: string | null; created_at: string }
interface LedgerRec extends LedgerEntry { user_id: string; completion_id: string | null; badge_id: number | null }
interface JournalRec extends JournalEntry { user_id: string; completion_id: string | null }
interface SessionRec { id: string; mentee_id: string; mentor_id: string | null; topic: string; status: MentorSession['status']; notes: string | null; feedback: string | null; created_at: string; completed_at: string | null }
interface ReportRec { id: string; reporter_id: string; reported_user_id: string | null; target_type: Report['target_type']; target_id: string | null; reason: string; status: Report['status']; resolution: string | null; resolved_by: string | null; resolved_at: string | null; created_at: string }

interface DB {
  users: UserRow[];
  detections: DetectionRec[];
  assignments: AssignmentRec[];
  completions: CompletionRec[];
  ledger: LedgerRec[];
  user_badges: { user_id: string; badge_id: number; earned_at: string }[];
  badges: Badge[];
  journal: JournalRec[];
  sessions: SessionRec[];
  reports: ReportRec[];
  playlists: Playlist[];
  session: string | null;
  seq: number;
  faces?: { user_id: string; descriptor: number[]; updated_at: string }[];
  mentorships?: { mentee_id: string; mentor_id: string; assigned_at: string }[];
  consents?: { user_id: string; allowed: boolean; created_at: string }[];
}

const uuid = () => crypto.randomUUID();

async function hash(pw: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('moodwave:' + pw));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function emptyDb(): DB {
  return {
    users: [], detections: [], assignments: [], completions: [], ledger: [], user_badges: [],
    badges: structuredClone(DEFAULT_BADGES), journal: [], sessions: [], reports: [],
    playlists: structuredClone(DEFAULT_PLAYLISTS), session: null, seq: 1,
  };
}

/** Motor con reloj inyectable (se usa para generar datos de ejemplo en el pasado). */
class Engine {
  now: () => Date = () => new Date();
  constructor(public db: DB) {}

  iso() { return this.now().toISOString(); }
  today() { return localDay(this.now()); }
  user(id: string) {
    const u = this.db.users.find((x) => x.id === id);
    if (!u) throw new Error('Usuario no encontrado');
    return u;
  }
  active(id: string | null) {
    if (!id) throw new Error('No autenticado');
    const u = this.user(id);
    if (u.suspended) throw new Error('Cuenta suspendida');
    return u;
  }
  earnedToday(userId: string) {
    const today = this.today();
    return this.db.ledger.filter((l) => l.user_id === userId && localDay(l.created_at) === today)
      .reduce((s, l) => s + l.amount, 0);
  }
  grantXp(userId: string, amount: number, reason: LedgerRec['reason'], extra: { completion_id?: string; badge_id?: number; note?: string } = {}) {
    const g = cappedGrant(amount, this.earnedToday(userId));
    if (g > 0) {
      this.db.ledger.push({
        id: this.db.seq++, user_id: userId, amount: g, reason, note: extra.note ?? null,
        completion_id: extra.completion_id ?? null, badge_id: extra.badge_id ?? null, created_at: this.iso(),
      });
      const u = this.user(userId);
      u.xp += g;
      u.level = levelForXp(u.xp);
    }
    return g;
  }
  stats(userId: string): BadgeStats {
    const u = this.user(userId);
    const dets = this.db.detections.filter((d) => d.user_id === userId);
    const comps = this.db.completions.filter((c) => c.user_id === userId);
    const perActivity: Record<number, number> = {};
    for (const c of comps) {
      const a = this.db.assignments.find((x) => x.id === c.assignment_id)!;
      const id = ACTIVITY_BY_KEY[a.activity].id;
      perActivity[id] = (perActivity[id] ?? 0) + 1;
    }
    return {
      detections: dets.length,
      completions: comps.length,
      perActivity,
      streak: Math.max(u.streak, u.longest_streak),
      level: u.level,
      distinctEmotions: new Set(dets.map((d) => d.emotion)).size,
      distinctActivities: Object.keys(perActivity).length,
    };
  }
  evaluateBadges(userId: string): Badge[] {
    const out: Badge[] = [];
    for (;;) {
      const s = this.stats(userId);
      const owned = new Set(this.db.user_badges.filter((b) => b.user_id === userId).map((b) => b.badge_id));
      const b = this.db.badges.find((x) => !owned.has(x.id) && badgeValue(x.rule_type, x.rule_activity_id, s) >= x.threshold);
      if (!b) return out;
      this.db.user_badges.push({ user_id: userId, badge_id: b.id, earned_at: this.iso() });
      if (b.xp_reward > 0) this.grantXp(userId, b.xp_reward, 'badge', { badge_id: b.id, note: b.name });
      out.push(b);
    }
  }
  recordDetection(userId: string, emotion: EmotionKey, confidence: number, scores: Record<string, number>, source: 'camera' | 'manual'): DetectionResult {
    this.active(userId);
    const today = this.today();
    const firstToday = !this.db.detections.some((d) => d.user_id === userId && localDay(d.created_at) === today);
    const det: DetectionRec = { id: uuid(), user_id: userId, emotion, confidence: Math.min(1, Math.max(0, confidence)), scores, source, created_at: this.iso() };
    this.db.detections.push(det);
    const [activity] = RECOMMENDATIONS[emotion][0];
    const asg: AssignmentRec = { id: uuid(), user_id: userId, detection_id: det.id, activity, reason: 'recommended', created_at: this.iso() };
    this.db.assignments.push(asg);
    const xp = firstToday ? this.grantXp(userId, DAILY_CHECKIN_XP, 'daily_checkin', { note: 'Check-in emocional del día' }) : 0;
    return { detection_id: det.id, assignment_id: asg.id, emotion, xp_granted: xp, new_badges: this.evaluateBadges(userId) };
  }
  assign(userId: string, activity: ActivityKey, detectionId: string | null) {
    this.active(userId);
    if (detectionId && !this.db.detections.some((d) => d.id === detectionId && d.user_id === userId)) throw new Error('Detección inválida');
    const pending = this.db.assignments.find((a) => a.user_id === userId && a.activity === activity &&
      a.detection_id === detectionId && !this.db.completions.some((c) => c.assignment_id === a.id));
    if (pending) return pending.id;
    const asg: AssignmentRec = { id: uuid(), user_id: userId, detection_id: detectionId, activity, reason: detectionId ? 'alternative' : 'free_choice', created_at: this.iso() };
    this.db.assignments.push(asg);
    return asg.id;
  }
  complete(userId: string, assignmentId: string, input: { durationSeconds: number; score?: number | null; journalText?: string | null; journalPrompt?: string | null; game?: string | null }): CompletionResult {
    const u = this.active(userId);
    const asg = this.db.assignments.find((a) => a.id === assignmentId && a.user_id === userId);
    if (!asg) throw new Error('Asignación no encontrada');
    if (this.db.completions.some((c) => c.assignment_id === assignmentId)) throw new Error('Esta actividad ya fue completada');
    const act = ACTIVITY_BY_KEY[asg.activity];
    if (input.durationSeconds < act.min_duration_sec) throw new Error(`Duración insuficiente: mínimo ${act.min_duration_sec} segundos`);
    const text = input.journalText?.trim() ?? '';
    if (act.key === 'journaling' && text.length < 20) throw new Error('La entrada del diario debe tener al menos 20 caracteres');
    const levelBefore = u.level;
    const comp: CompletionRec = { id: uuid(), assignment_id: assignmentId, user_id: userId, duration_seconds: Math.round(input.durationSeconds), score: input.score ?? null, game_key: act.key === 'minigame' ? input.game ?? null : null, created_at: this.iso() };
    this.db.completions.push(comp);
    if (act.key === 'journaling') {
      const emotion = this.db.detections.find((d) => d.id === asg.detection_id)?.emotion ?? null;
      this.db.journal.push({ id: uuid(), user_id: userId, completion_id: comp.id, emotion, prompt: input.journalPrompt ?? '', content: text, created_at: this.iso() });
    }
    const today = this.today();
    u.streak = nextStreak(u.streak, u.last_active_date, today);
    u.last_active_date = today;
    u.longest_streak = Math.max(u.longest_streak, u.streak);
    const xp = this.grantXp(userId, act.base_xp, 'activity', { completion_id: comp.id, note: act.name });
    const badges = this.evaluateBadges(userId);
    return {
      completion_id: comp.id, xp_granted: xp, xp_base: act.base_xp, capped: xp < act.base_xp, xp_total: u.xp,
      level: u.level, leveled_up: u.level > levelBefore, streak: u.streak, new_badges: badges,
    };
  }
  newUser(email: string, password_hash: string, username: string, role: RoleKey): UserRow {
    let base = username.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    if (base.length < 3) base += 'user';
    let name = base;
    for (let n = 1; this.db.users.some((u) => u.username === name); n++) name = base + n;
    const u: UserRow = {
      id: uuid(), email: email.toLowerCase(), password_hash, username: name, display_name: username, role,
      xp: 0, level: 1, streak: 0, longest_streak: 0, last_active_date: null, suspended: false, created_at: this.iso(),
    };
    this.db.users.push(u);
    return u;
  }
}

// ---------------------------------------------------------------- datos de ejemplo
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

const JOURNAL_SAMPLES = [
  'Hoy tuve mucho trabajo de la escuela, pero logré terminar el proyecto a tiempo y me sentí orgulloso.',
  'Me sentí algo ansioso antes de la presentación; respirar profundo me ayudó bastante.',
  'Pasé la tarde con mi familia y me reí mucho. Quiero recordar este día.',
  'No dormí bien y todo me molestaba. Escribirlo me ayuda a ver que fue un mal día, no una mala vida.',
];

export async function buildSeedDb(): Promise<DB> {
  const db = emptyDb();
  const e = new Engine(db);
  const pw = await hash(DEMO_PASSWORD);
  const start = Date.now() - 20 * 86400_000;
  e.now = () => new Date(start);
  const accounts: [string, string, RoleKey][] = [
    ['demo@moodwave.app', 'demo', 'listener'],
    ['curador@moodwave.app', 'curador', 'curator'],
    ['moderador@moodwave.app', 'moderador', 'moderator'],
    ['mentor@moodwave.app', 'mentor', 'mentor'],
    ['analista@moodwave.app', 'analista', 'analyst'],
    ['admin@moodwave.app', 'admin', 'admin'],
    ['superadmin@moodwave.app', 'superadmin', 'superadmin'],
    ['ana@moodwave.app', 'ana_ola', 'listener'],
    ['carlos@moodwave.app', 'carlos_zen', 'listener'],
    ['valeria@moodwave.app', 'vale_waves', 'listener'],
    ['diego@moodwave.app', 'diego_calma', 'listener'],
  ];
  const users = accounts.map(([email, name, role]) => e.newUser(email, pw, name, role));
  users[0].display_name = 'Usuario Demo';

  const rand = rng(7);
  const emotionKeys = EMOTIONS.map((x) => x.key);
  // Cada usuario tiene una "constancia" distinta; el demo usa la app casi a diario.
  users.forEach((u, idx) => {
    const consistency = idx === 0 ? 0.92 : 0.25 + rand() * 0.6;
    for (let day = 14; day >= 0; day--) {
      const isRecent = day <= 4;
      if (!(idx === 0 && isRecent) && rand() > consistency) continue;
      const sessions = 1 + Math.floor(rand() * 2);
      for (let s = 0; s < sessions; s++) {
        const base = new Date();
        base.setHours(9 + Math.floor(rand() * 11), Math.floor(rand() * 60), 0, 0);
        let t = base.getTime() - day * 86400_000;
        if (t > Date.now() - 60_000) t = Date.now() - 3600_000 * (s + 1);
        e.now = () => new Date(t);
        const emotion = emotionKeys[Math.floor(rand() * emotionKeys.length)];
        const conf = 0.6 + rand() * 0.38;
        const res = e.recordDetection(u.id, emotion, conf, { [emotion]: conf }, 'camera');
        if (rand() < 0.8) {
          const act = ACTIVITY_BY_KEY[e.db.assignments.find((a) => a.id === res.assignment_id)!.activity];
          t += 5 * 60_000;
          e.now = () => new Date(t);
          e.complete(u.id, res.assignment_id, {
            durationSeconds: Math.max(act.min_duration_sec, 45 + Math.floor(rand() * 200)),
            score: act.key === 'minigame' ? 10 + Math.floor(rand() * 30) : null,
            journalText: act.key === 'journaling' ? JOURNAL_SAMPLES[Math.floor(rand() * JOURNAL_SAMPLES.length)] : null,
            journalPrompt: act.key === 'journaling' ? '¿Cómo te sientes en este momento?' : null,
          });
        }
      }
    }
  });
  e.now = () => new Date(Date.now() - 2 * 86400_000);
  db.sessions.push({ id: uuid(), mentee_id: users[0].id, mentor_id: users[3].id, topic: 'Me cuesta organizarme con los exámenes finales.', status: 'completed', notes: 'Seguir en 1 semana.', feedback: 'Prueba bloques de estudio de 25 min con meditación de 1 min entre bloques. ¡Vas muy bien!', created_at: e.iso(), completed_at: e.iso() });
  db.sessions.push({ id: uuid(), mentee_id: users[8].id, mentor_id: null, topic: 'Siento mucha ansiedad por las mañanas.', status: 'requested', notes: null, feedback: null, created_at: e.iso(), completed_at: null });
  db.reports.push({ id: uuid(), reporter_id: users[7].id, reported_user_id: users[10].id, target_type: 'user', target_id: null, reason: 'Nombre de usuario inapropiado en el ranking.', status: 'open', resolution: null, resolved_by: null, resolved_at: null, created_at: e.iso() });
  // Mentoría: demo y ana_ola acompañadas por @mentor; solo demo dio permiso para ver su historial.
  db.mentorships = [
    { mentee_id: users[0].id, mentor_id: users[3].id, assigned_at: e.iso() },
    { mentee_id: users[7].id, mentor_id: users[3].id, assigned_at: e.iso() },
  ];
  db.consents = [{ user_id: users[0].id, allowed: true, created_at: e.iso() }];
  db.session = null;
  return db;
}

// ---------------------------------------------------------------- API
export function createDemoApi(): Api {
  let db: DB | null = null;
  const listeners = new Set<(id: string | null) => void>();

  async function load(): Promise<DB> {
    if (db) return db;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) db = JSON.parse(raw) as DB;
    } catch { /* almacenamiento no disponible */ }
    if (!db) { db = await buildSeedDb(); save(); }
    return db;
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch { /* sin persistencia */ }
  }
  async function engine() { return new Engine(await load()); }
  async function me() {
    const d = await load();
    if (!d.session) throw new Error('No autenticado');
    return d.session;
  }
  async function requirePerm(...perms: Perm[]) {
    const e = await engine();
    const u = e.user(await me());
    if (u.suspended || !perms.some((p) => can(u.role, p))) throw new Error('Permiso denegado');
    return { e, u };
  }
  const consentOf = (d: DB, userId: string) =>
    [...(d.consents ?? [])].filter((c) => c.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.allowed ?? false;
  function setSession(id: string | null) {
    db!.session = id;
    save();
    listeners.forEach((l) => l(id));
  }
  const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 60));
  const publicProfile = ({ email: _e, password_hash: _p, ...p }: UserRow): Profile => p;
  const nameOf = (d: DB, id: string | null) => (id ? d.users.find((u) => u.id === id)?.username ?? null : null);

  return {
    mode: 'demo',

    async getUserId() { return (await load()).session; },
    onAuthChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    async signUp(email, password, username) {
      const e = await engine();
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
      if (e.db.users.some((u) => u.email === email.toLowerCase())) throw new Error('Ese correo ya está registrado');
      const u = e.newUser(email, await hash(password), username, 'listener');
      setSession(u.id);
      return { needsConfirmation: false };
    },
    async signIn(email, password) {
      const e = await engine();
      const u = e.db.users.find((x) => x.email === email.trim().toLowerCase());
      if (!u || u.password_hash !== (await hash(password))) throw new Error('Correo o contraseña incorrectos');
      setSession(u.id);
    },
    async signInGuest() {
      const e = await engine();
      const u = e.newUser(`guest-${Date.now()}@local`, '', 'invitado', 'guest');
      setSession(u.id);
    },
    async signOut() { await load(); setSession(null); },
    async resetPassword() { throw new Error('En modo demo usa la contraseña "' + DEMO_PASSWORD + '" o crea una cuenta nueva.'); },

    async faceLogin(descriptor) {
      const d = await load();
      if (!isValidDescriptor(descriptor)) throw new Error('Plantilla facial inválida');
      const faces = d.faces ?? [];
      if (!faces.length) throw new Error('Todavía nadie ha registrado su rostro en este navegador. Entra con contraseña y regístralo en tu perfil.');
      const hit = matchFace(descriptor, faces, FACE_THRESHOLD);
      if (!hit) throw new Error('No te reconozco. Usa tu contraseña o vuelve a registrar tu rostro.');
      const u = d.users.find((x) => x.id === hit.candidate.user_id);
      if (!u) throw new Error('Cuenta no encontrada');
      if (u.suspended) throw new Error('Tu cuenta está suspendida.');
      setSession(u.id);
    },
    async getFaceStatus() {
      const d = await load();
      const f = (d.faces ?? []).find((x) => x.user_id === d.session);
      return { enrolled: !!f, updated_at: f?.updated_at ?? null };
    },
    async enrollFace(descriptor) {
      const e = await engine();
      const u = e.active(await me());
      if (u.role === 'guest') throw new Error('Crea una cuenta para registrar tu rostro');
      if (!isValidDescriptor(descriptor)) throw new Error('Plantilla facial inválida');
      const faces = (e.db.faces ??= []);
      const clash = matchFace(descriptor, faces.filter((f) => f.user_id !== u.id), FACE_THRESHOLD);
      if (clash) throw new Error('Ese rostro ya está registrado en otra cuenta. Si es un error, pide a un administrador que lo borre.');
      e.db.faces = [...faces.filter((f) => f.user_id !== u.id), { user_id: u.id, descriptor, updated_at: e.iso() }];
      save();
    },
    async deleteFace() {
      const d = await load();
      d.faces = (d.faces ?? []).filter((f) => f.user_id !== d.session);
      save();
    },

    async getProfile() {
      const e = await engine();
      const u = e.user(await me());
      return delay({ ...publicProfile(u), streak: effectiveStreak(u.streak, u.last_active_date, e.today()) });
    },
    async updateProfile(patch) {
      const e = await engine();
      const u = e.user(await me());
      if (patch.username !== undefined) {
        const name = patch.username.trim();
        if (!/^[a-zA-Z0-9_]{3,24}$/.test(name)) throw new Error('Usuario: 3-24 caracteres (letras, números, _)');
        if (e.db.users.some((x) => x.username === name && x.id !== u.id)) throw new Error('Ese nombre de usuario ya existe');
        u.username = name;
      }
      if (patch.display_name !== undefined) u.display_name = patch.display_name.trim();
      save();
    },

    async getBadges() { return [...(await load()).badges].sort((a, b) => a.id - b.id); },
    async getPlaylists() { return (await load()).playlists; },
    async updatePlaylist(emotion, spotifyId, title) {
      const { e } = await requirePerm('curate');
      const p = e.db.playlists.find((x) => x.emotion === emotion)!;
      p.spotify_playlist_id = spotifyId;
      p.title = title;
      save();
    },
    async getRecommendations(emotion) {
      return RECOMMENDATIONS[emotion].map(([activity, reason], i) => ({ activity, reason, priority: i + 1 }));
    },

    async recordDetection(emotion, confidence, scores, source) {
      const e = await engine();
      const r = e.recordDetection(await me(), emotion, confidence, scores, source);
      save();
      return delay(r);
    },
    async assignActivity(activity, detectionId) {
      const e = await engine();
      const id = e.assign(await me(), activity, detectionId ?? null);
      save();
      return id;
    },
    async getAssignment(id) {
      const e = await engine();
      const uid = await me();
      const a = e.db.assignments.find((x) => x.id === id && x.user_id === uid);
      if (!a) throw new Error('Asignación no encontrada');
      return {
        id: a.id, activity: a.activity, detection_id: a.detection_id, reason: a.reason,
        emotion: e.db.detections.find((d) => d.id === a.detection_id)?.emotion ?? null,
        completed: e.db.completions.some((c) => c.assignment_id === a.id),
      };
    },
    async completeActivity(assignmentId, input) {
      const e = await engine();
      const r = e.complete(await me(), assignmentId, input);
      save();
      return delay(r);
    },

    async getDetections(sinceDays) {
      const d = await load();
      const uid = await me();
      const since = Date.now() - sinceDays * 86400_000;
      return d.detections.filter((x) => x.user_id === uid && Date.parse(x.created_at) >= since)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(({ id, emotion, confidence, source, created_at }) => ({ id, emotion, confidence, source, created_at }));
    },
    async getHistory(limit) {
      const d = await load();
      const uid = await me();
      return d.assignments.filter((a) => a.user_id === uid)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit)
        .map((a) => {
          const det = d.detections.find((x) => x.id === a.detection_id);
          const c = d.completions.find((x) => x.assignment_id === a.id);
          return {
            assignment_id: a.id, activity: a.activity, reason: a.reason, assigned_at: a.created_at,
            emotion: det?.emotion ?? null, confidence: det?.confidence ?? null,
            completed_at: c?.created_at ?? null, duration_seconds: c?.duration_seconds ?? null,
          };
        });
    },
    async getLedger(limit) {
      const d = await load();
      const uid = await me();
      return d.ledger.filter((l) => l.user_id === uid).sort((a, b) => b.id - a.id).slice(0, limit)
        .map(({ id, amount, reason, note, created_at }) => ({ id, amount, reason, note, created_at }));
    },
    async getMyBadges() {
      const d = await load();
      const uid = await me();
      return d.user_badges.filter((b) => b.user_id === uid).map(({ badge_id, earned_at }) => ({ badge_id, earned_at }));
    },
    async getActivityCounts() {
      const e = await engine();
      const s = e.stats(await me());
      return Object.fromEntries(ACTIVITIES.map((a) => [a.key, s.perActivity[a.id] ?? 0])) as Record<ActivityKey, number>;
    },
    async getJournal() {
      const d = await load();
      const uid = await me();
      return d.journal.filter((j) => j.user_id === uid).sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(({ id, emotion, prompt, content, created_at }) => ({ id, emotion, prompt, content, created_at }));
    },
    async deleteJournal(id) {
      const d = await load();
      const uid = await me();
      d.journal = d.journal.filter((j) => !(j.id === id && j.user_id === uid));
      save();
    },
    async getLeaderboard() {
      const e = await engine();
      return e.db.users.filter((u) => !u.suspended && u.role !== 'guest')
        .sort((a, b) => b.xp - a.xp || a.created_at.localeCompare(b.created_at)).slice(0, 50)
        .map((u) => ({ user_id: u.id, username: u.username, display_name: u.display_name, level: u.level, xp: u.xp, streak: effectiveStreak(u.streak, u.last_active_date, e.today()) }));
    },

    async listMentorSessions() {
      const e = await engine();
      const uid = await me();
      const isMentor = can(e.user(uid).role, 'mentor');
      return e.db.sessions
        .filter((s) => s.mentee_id === uid || s.mentor_id === uid || (s.status === 'requested' && isMentor))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((s) => ({
          ...s, notes: s.mentor_id === uid ? s.notes : null,
          mentee_username: nameOf(e.db, s.mentee_id)!, mentor_username: nameOf(e.db, s.mentor_id),
        }));
    },
    async requestMentorSession(topic) {
      const e = await engine();
      const uid = (e.active(await me())).id;
      if (topic.trim().length < 3) throw new Error('Describe brevemente el tema');
      e.db.sessions.push({ id: uuid(), mentee_id: uid, mentor_id: null, topic: topic.trim(), status: 'requested', notes: null, feedback: null, created_at: e.iso(), completed_at: null });
      save();
    },
    async cancelMentorSession(id) {
      const d = await load();
      const s = d.sessions.find((x) => x.id === id && x.mentee_id === d.session && x.status === 'requested');
      if (!s) throw new Error('No se puede cancelar esta sesión');
      s.status = 'cancelled';
      save();
    },
    async claimMentorSession(id) {
      const { e, u } = await requirePerm('mentor');
      const s = e.db.sessions.find((x) => x.id === id && x.status === 'requested' && x.mentee_id !== u.id);
      if (!s) throw new Error('La sesión ya no está disponible');
      s.mentor_id = u.id;
      s.status = 'active';
      e.db.mentorships ??= [];
      if (!e.db.mentorships.some((m) => m.mentee_id === s.mentee_id)) e.db.mentorships.push({ mentee_id: s.mentee_id, mentor_id: u.id, assigned_at: e.iso() });
      save();
    },
    async completeMentorSession(id, feedback, notes) {
      const e = await engine();
      const uid = await me();
      const s = e.db.sessions.find((x) => x.id === id && x.mentor_id === uid && x.status === 'active');
      if (!s) throw new Error('Sesión no encontrada');
      Object.assign(s, { status: 'completed', feedback, notes, completed_at: e.iso() });
      save();
    },

    async getMyMentorship() {
      const d = await load();
      const uid = await me();
      const m = (d.mentorships ?? []).find((x) => x.mentee_id === uid);
      const last = [...(d.consents ?? [])].filter((c) => c.user_id === uid).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      return { mentor_username: nameOf(d, m?.mentor_id ?? null), consent: last?.allowed ?? false, consent_at: last?.created_at ?? null };
    },
    async setMentorConsent(allowed) {
      const e = await engine();
      const uid = await me();
      (e.db.consents ??= []).push({ user_id: uid, allowed, created_at: e.iso() });
      save();
    },
    async listMentees() {
      const { e, u } = await requirePerm('mentor');
      return (e.db.mentorships ?? []).filter((m) => m.mentor_id === u.id).map((m) => {
        const p = e.user(m.mentee_id);
        const ok = consentOf(e.db, p.id);
        const dets = e.db.detections.filter((d) => d.user_id === p.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
        return {
          user_id: p.id, username: p.username, display_name: p.display_name, assigned_at: m.assigned_at, consent: ok,
          level: ok ? p.level : null, xp: ok ? p.xp : null, streak: ok ? effectiveStreak(p.streak, p.last_active_date, e.today()) : null,
          last_emotion: ok ? dets[0]?.emotion ?? null : null, last_seen: ok ? dets[0]?.created_at ?? null : null,
        };
      }).sort((a, b) => a.username.localeCompare(b.username));
    },
    async getMentee(userId) {
      const { e, u } = await requirePerm('mentor');
      if (!(e.db.mentorships ?? []).some((m) => m.mentee_id === userId && m.mentor_id === u.id)) throw new Error('Esta persona no está asignada a ti');
      if (!consentOf(e.db, userId)) throw new Error('Esta persona no ha dado permiso para ver su historial');
      const p = e.user(userId);
      const since = Date.now() - 30 * 86400_000;
      return {
        user_id: p.id, username: p.username, display_name: p.display_name, level: p.level, xp: p.xp,
        streak: effectiveStreak(p.streak, p.last_active_date, e.today()), longest_streak: p.longest_streak,
        detections: e.db.detections.filter((d) => d.user_id === userId && Date.parse(d.created_at) >= since)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map(({ id, emotion, confidence, source, created_at }) => ({ id, emotion, confidence, source, created_at })),
        history: e.db.assignments.filter((a) => a.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30)
          .map((a) => {
            const det = e.db.detections.find((x) => x.id === a.detection_id);
            const c = e.db.completions.find((x) => x.assignment_id === a.id);
            return { assignment_id: a.id, activity: a.activity, reason: a.reason, assigned_at: a.created_at, emotion: det?.emotion ?? null, confidence: det?.confidence ?? null, completed_at: c?.created_at ?? null, duration_seconds: c?.duration_seconds ?? null };
          }),
      };
    },
    async setMentor(userId, mentorId) {
      const { e } = await requirePerm('manage_users');
      e.db.mentorships = (e.db.mentorships ?? []).filter((m) => m.mentee_id !== userId);
      if (mentorId) {
        if (mentorId === userId) throw new Error('Nadie puede ser su propio mentor');
        if (!can(e.user(mentorId).role, 'mentor')) throw new Error('Esa persona no tiene rol de mentor');
        e.db.mentorships.push({ mentee_id: userId, mentor_id: mentorId, assigned_at: e.iso() });
      }
      save();
    },

    async createReport(r) {
      const e = await engine();
      const uid = await me();
      if (r.reason.trim().length < 3) throw new Error('Describe el motivo del reporte');
      e.db.reports.push({ id: uuid(), reporter_id: uid, reported_user_id: r.reported_user_id ?? null, target_type: r.target_type, target_id: r.target_id ?? null, reason: r.reason.trim(), status: 'open', resolution: null, resolved_by: null, resolved_at: null, created_at: e.iso() });
      save();
    },
    async listReports() {
      const { e } = await requirePerm('moderate');
      return [...e.db.reports]
        .sort((a, b) => Number(b.status === 'open') - Number(a.status === 'open') || b.created_at.localeCompare(a.created_at))
        .map((r) => ({
          id: r.id, reporter_username: nameOf(e.db, r.reporter_id)!, reported_user_id: r.reported_user_id,
          reported_username: nameOf(e.db, r.reported_user_id), target_type: r.target_type, target_id: r.target_id,
          reason: r.reason, status: r.status, resolution: r.resolution, created_at: r.created_at, resolved_at: r.resolved_at,
        }));
    },
    async resolveReport(id, status, resolution) {
      const { e, u } = await requirePerm('moderate');
      const r = e.db.reports.find((x) => x.id === id);
      if (!r) throw new Error('Reporte no encontrado');
      Object.assign(r, { status, resolution, resolved_by: u.id, resolved_at: e.iso() });
      save();
    },
    async setSuspended(userId, suspended) {
      const { e, u } = await requirePerm('moderate', 'manage_users');
      if (userId === u.id) throw new Error('No puedes suspenderte a ti mismo');
      const t = e.user(userId);
      if (!canSuspend(u.role, t.role)) throw new Error('Solo un superadmin puede suspender a un administrador');
      t.suspended = suspended;
      save();
    },

    async listUsers() {
      const { e } = await requirePerm('moderate', 'manage_users');
      const ms = e.db.mentorships ?? [];
      return [...e.db.users].sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map<AdminUser>((u) => ({ id: u.id, username: u.username, display_name: u.display_name, role_key: u.role, xp: u.xp, level: u.level, streak: effectiveStreak(u.streak, u.last_active_date, e.today()), suspended: u.suspended, created_at: u.created_at, has_face: (e.db.faces ?? []).some((f) => f.user_id === u.id), mentor_id: ms.find((m) => m.mentee_id === u.id)?.mentor_id ?? null, mentor_username: nameOf(e.db, ms.find((m) => m.mentee_id === u.id)?.mentor_id ?? null) }));
    },
    async adminDeleteFace(userId) {
      const { e } = await requirePerm('manage_users');
      e.db.faces = (e.db.faces ?? []).filter((f) => f.user_id !== userId);
      save();
    },
    async setRole(userId, role) {
      const { e, u } = await requirePerm('manage_users');
      if (userId === u.id) throw new Error('No puedes cambiar tu propio rol');
      const t = e.user(userId);
      if ((isAdminRole(role) || isAdminRole(t.role)) && !can(u.role, 'manage_admins'))
        throw new Error('Solo un superadmin puede gestionar administradores');
      t.role = role;
      save();
    },
    async saveBadge(b) {
      const { e } = await requirePerm('manage_badges');
      if (b.id) {
        const i = e.db.badges.findIndex((x) => x.id === b.id);
        e.db.badges[i] = { ...(b as Badge) };
      } else {
        if (e.db.badges.some((x) => x.key === b.key)) throw new Error('Ya existe un badge con esa clave');
        e.db.badges.push({ ...b, id: Math.max(0, ...e.db.badges.map((x) => x.id)) + 1 });
      }
      save();
    },
    async deleteBadge(id) {
      const { e } = await requirePerm('manage_badges');
      e.db.badges = e.db.badges.filter((b) => b.id !== id);
      e.db.user_badges = e.db.user_badges.filter((b) => b.badge_id !== id);
      save();
    },
    async getAnalytics(days): Promise<Analytics> {
      const { e } = await requirePerm('analytics');
      const since = Date.now() - days * 86400_000;
      const inRange = <T extends { created_at: string }>(xs: T[]) => xs.filter((x) => Date.parse(x.created_at) >= since);
      const dets = inRange(e.db.detections);
      const asg = inRange(e.db.assignments);
      const comps = new Set(e.db.completions.map((c) => c.assignment_id));
      const daily: Analytics['daily'] = [];
      for (let i = days - 1; i >= 0; i--) {
        const day = localDay(new Date(Date.now() - i * 86400_000));
        daily.push({ day, detections: dets.filter((x) => localDay(x.created_at) === day).length });
      }
      return {
        total_users: e.db.users.length,
        active_users: new Set(dets.map((d) => d.user_id)).size,
        detections: dets.length,
        completions: inRange(e.db.completions).length,
        xp_awarded: inRange(e.db.ledger).reduce((s, l) => s + l.amount, 0),
        emotions: EMOTIONS.map((em) => ({ key: em.key, count: dets.filter((d) => d.emotion === em.key).length })),
        activities: ACTIVITIES.map((a) => {
          const xs = asg.filter((x) => x.activity === a.key);
          return { key: a.key, assigned: xs.length, completed: xs.filter((x) => comps.has(x.id)).length };
        }),
        daily,
      };
    },
  };
}

/** Borra los datos del modo demo (botón en el perfil). */
export function resetDemoData() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* nada */ }
}
