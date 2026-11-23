export type EmotionKey = 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised' | 'neutral';
export type ActivityKey = 'minigame' | 'journaling' | 'meditation' | 'music';
export type RoleKey =
  | 'guest' | 'listener' | 'curator' | 'mentor' | 'analyst' | 'admin' | 'superadmin';
export type BadgeRule =
  | 'detections' | 'completions' | 'activity' | 'streak' | 'level' | 'distinct_emotions' | 'distinct_activities';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  role: RoleKey;
  xp: number;
  level: number;
  streak: number;
  longest_streak: number;
  last_active_date: string | null;
  suspended: boolean;
  created_at: string;
  language: 'es' | 'en' | 'pt' | 'fr' | 'de' | 'it';
  theme: 'dark' | 'light' | 'system';
}

export interface Badge {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  rule_type: BadgeRule;
  rule_activity_id: number | null;
  threshold: number;
}

export interface EarnedBadge { badge_id: number; earned_at: string }

export interface Recommendation { activity: ActivityKey; priority: number; reason: string }

export interface DetectionResult {
  detection_id: string;
  assignment_id: string;
  emotion: EmotionKey;
  xp_granted: number;
  new_badges: Badge[];
}

export interface CompletionInput {
  durationSeconds: number;
  score?: number | null;
  journalText?: string | null;
  journalPrompt?: string | null;
  game?: string | null;
}

export interface CompletionResult {
  completion_id: string;
  xp_granted: number;
  xp_base: number;
  capped: boolean;
  xp_total: number;
  level: number;
  leveled_up: boolean;
  streak: number;
  new_badges: Badge[];
}

export interface Assignment {
  id: string;
  activity: ActivityKey;
  detection_id: string | null;
  emotion: EmotionKey | null;
  reason: 'recommended' | 'alternative' | 'free_choice';
  completed: boolean;
}

export interface DetectionRow {
  id: string;
  emotion: EmotionKey;
  confidence: number;
  source: 'camera' | 'manual';
  created_at: string;
}

/** Una fila del historial: asignación + (detección origen) + (completado). */
export interface HistoryItem {
  assignment_id: string;
  activity: ActivityKey;
  reason: Assignment['reason'];
  assigned_at: string;
  emotion: EmotionKey | null;
  confidence: number | null;
  completed_at: string | null;
  duration_seconds: number | null;
}

export interface LedgerEntry {
  id: number;
  amount: number;
  reason: 'activity' | 'daily_checkin' | 'badge' | 'admin_adjustment';
  note: string | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  emotion: EmotionKey | null;
  prompt: string;
  content: string;
  created_at: string;
}

export interface LeaderRow {
  user_id: string;
  username: string;
  display_name: string;
  level: number;
  xp: number;
  streak: number;
}

export interface MentorSession {
  id: string;
  mentee_id: string;
  mentee_username: string;
  mentor_id: string | null;
  mentor_username: string | null;
  topic: string;
  status: 'requested' | 'active' | 'completed' | 'cancelled';
  notes: string | null;
  feedback: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Report {
  id: string;
  reporter_username: string;
  reported_user_id: string | null;
  reported_username: string | null;
  target_type: 'user' | 'mentor_session';
  target_id: string | null;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  role_key: RoleKey;
  xp: number;
  level: number;
  streak: number;
  suspended: boolean;
  created_at: string;
  has_face: boolean;
  mentor_id: string | null;
  mentor_username: string | null;
}

export interface MyMentorship { mentor_username: string | null; consent: boolean; consent_at: string | null }

export interface MenteeRow {
  user_id: string; username: string; display_name: string; assigned_at: string; consent: boolean;
  level: number | null; xp: number | null; streak: number | null; last_emotion: EmotionKey | null; last_seen: string | null;
}

export interface MenteeDetail {
  user_id: string; username: string; display_name: string; level: number; xp: number; streak: number; longest_streak: number;
  detections: DetectionRow[];
  history: HistoryItem[];
}

export interface FaceStatus { enrolled: boolean; updated_at: string | null }

export interface Analytics {
  total_users: number;
  active_users: number;
  detections: number;
  completions: number;
  xp_awarded: number;
  emotions: { key: EmotionKey; count: number }[];
  activities: { key: ActivityKey; assigned: number; completed: number }[];
  daily: { day: string; detections: number }[];
}

export interface Playlist { emotion: EmotionKey; spotify_playlist_id: string; title: string }

export interface SignUpResult { needsConfirmation: boolean }
