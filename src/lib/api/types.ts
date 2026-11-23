import type {
  ActivityKey, AdminUser, Analytics, Assignment, Badge, CompletionInput, CompletionResult, DetectionResult,
  DetectionRow, EarnedBadge, EmotionKey, FaceStatus, HistoryItem, MenteeDetail, MenteeRow, MyMentorship, JournalEntry, LeaderRow, LedgerEntry, MentorSession,
  Playlist, Profile, Recommendation, Report, RoleKey, SignUpResult,
} from '../types';

/** Contrato común de los dos backends: Supabase (producción) y Demo (localStorage). */
export interface Api {

  // Autenticación
  getUserId(): Promise<string | null>;
  onAuthChange(cb: (userId: string | null) => void): () => void;
  signUp(email: string, password: string, username: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<void>;
  signInGuest(): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;

  // Inicio de sesión con rostro (descriptor de 128 números calculado en el navegador)
  faceLogin(descriptor: number[]): Promise<void>;
  getFaceStatus(): Promise<FaceStatus>;
  enrollFace(descriptor: number[]): Promise<void>;
  deleteFace(): Promise<void>;

  // Perfil
  getProfile(): Promise<Profile>;
  updateProfile(patch: { username?: string; display_name?: string }): Promise<void>;

  // Catálogos
  getBadges(): Promise<Badge[]>;
  getPlaylists(): Promise<Playlist[]>;
  updatePlaylist(emotion: EmotionKey, spotifyId: string, title: string): Promise<void>;
  getRecommendations(emotion: EmotionKey): Promise<Recommendation[]>;

  // Flujo principal: detectar → asignar → completar → recompensar
  recordDetection(emotion: EmotionKey, confidence: number, scores: Record<string, number>, source: 'camera' | 'manual'): Promise<DetectionResult>;
  assignActivity(activity: ActivityKey, detectionId?: string | null): Promise<string>;
  getAssignment(id: string): Promise<Assignment>;
  completeActivity(assignmentId: string, input: CompletionInput): Promise<CompletionResult>;

  // Datos personales
  getDetections(sinceDays: number): Promise<DetectionRow[]>;
  getHistory(limit: number): Promise<HistoryItem[]>;
  getLedger(limit: number): Promise<LedgerEntry[]>;
  getMyBadges(): Promise<EarnedBadge[]>;
  getActivityCounts(): Promise<Record<ActivityKey, number>>;
  getJournal(): Promise<JournalEntry[]>;
  deleteJournal(id: string): Promise<void>;
  getLeaderboard(): Promise<LeaderRow[]>;

  // Mentoría
  listMentorSessions(): Promise<MentorSession[]>;
  requestMentorSession(topic: string): Promise<void>;
  cancelMentorSession(id: string): Promise<void>;
  claimMentorSession(id: string): Promise<void>;
  completeMentorSession(id: string, feedback: string, notes: string): Promise<void>;
  getMyMentorship(): Promise<MyMentorship>;
  setMentorConsent(allowed: boolean): Promise<void>;
  listMentees(): Promise<MenteeRow[]>;
  getMentee(userId: string): Promise<MenteeDetail>;
  setMentor(userId: string, mentorId: string | null): Promise<void>;

  // Reportes y moderación
  createReport(r: { reported_user_id?: string | null; target_type: 'user' | 'mentor_session'; target_id?: string | null; reason: string }): Promise<void>;
  listReports(): Promise<Report[]>;
  resolveReport(id: string, status: 'resolved' | 'dismissed', resolution: string): Promise<void>;
  setSuspended(userId: string, suspended: boolean): Promise<void>;

  // Administración
  listUsers(): Promise<AdminUser[]>;
  setRole(userId: string, role: RoleKey): Promise<void>;
  adminDeleteFace(userId: string): Promise<void>;
  saveBadge(b: Omit<Badge, 'id'> & { id?: number }): Promise<void>;
  deleteBadge(id: number): Promise<void>;
  getAnalytics(days: number): Promise<Analytics>;
}
