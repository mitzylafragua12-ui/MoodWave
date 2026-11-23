// Catálogos espejo de supabase/schema.sql. Si cambias uno, cambia el otro.
import type { ActivityKey, Badge, EmotionKey, Playlist, RoleKey } from './types';

export interface EmotionInfo { id: number; key: EmotionKey; label: string; color: string; emoji: string }
export const EMOTIONS: EmotionInfo[] = [
  { id: 1, key: 'happy', label: 'Feliz', color: '#facc15', emoji: '😊' },
  { id: 2, key: 'sad', label: 'Triste', color: '#60a5fa', emoji: '😢' },
  { id: 3, key: 'angry', label: 'Enojo', color: '#f43f5e', emoji: '😠' },
  { id: 4, key: 'fearful', label: 'Miedo', color: '#a78bfa', emoji: '😨' },
  { id: 5, key: 'disgusted', label: 'Disgusto', color: '#4ade80', emoji: '🤢' },
  { id: 6, key: 'surprised', label: 'Sorpresa', color: '#fb923c', emoji: '😮' },
  { id: 7, key: 'neutral', label: 'Neutral', color: '#94a3b8', emoji: '😐' },
];
export const EMOTION_BY_KEY = Object.fromEntries(EMOTIONS.map((e) => [e.key, e])) as Record<EmotionKey, EmotionInfo>;

export interface ActivityInfo {
  id: number; key: ActivityKey; name: string; description: string;
  base_xp: number; min_duration_sec: number; color: string; icon: string;
}
export const ACTIVITIES: ActivityInfo[] = [
  { id: 1, key: 'minigame', name: 'Minijuego', description: 'Un juego distinto para cada emoción.', base_xp: 30, min_duration_sec: 20, color: '#22d3ee', icon: '🎮' },
  { id: 2, key: 'journaling', name: 'Diario emocional', description: 'Escribe cómo te sientes con una guía según tu emoción.', base_xp: 40, min_duration_sec: 0, color: '#a78bfa', icon: '✍️' },
  { id: 3, key: 'meditation', name: 'Meditación guiada', description: 'Respiración guiada con temporizador circular.', base_xp: 50, min_duration_sec: 60, color: '#38bdf8', icon: '🧘' },
  { id: 4, key: 'music', name: 'Música', description: 'Playlist de Spotify curada para tu estado de ánimo.', base_xp: 25, min_duration_sec: 60, color: '#f43f5e', icon: '🎧' },
];
export const ACTIVITY_BY_KEY = Object.fromEntries(ACTIVITIES.map((a) => [a.key, a])) as Record<ActivityKey, ActivityInfo>;
export const ACTIVITY_BY_ID = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a])) as Record<number, ActivityInfo>;

/** Motor de recomendación: [actividad, motivo] en orden de prioridad. */
export const RECOMMENDATIONS: Record<EmotionKey, [ActivityKey, string][]> = {
  happy: [
    ['music', 'Mantén la buena vibra con música que te acompañe.'],
    ['minigame', 'Aprovecha tu energía con un juego rápido.'],
    ['journaling', 'Registra qué te hizo sentir bien hoy.'],
    ['meditation', 'Una pausa breve para agradecer el momento.'],
  ],
  sad: [
    ['journaling', 'Escribir ayuda a ordenar lo que sientes.'],
    ['music', 'Música suave para acompañarte.'],
    ['meditation', 'Respirar con calma reduce la carga emocional.'],
    ['minigame', 'Un juego ligero para distraerte un momento.'],
  ],
  angry: [
    ['meditation', 'La respiración lenta baja la activación del enojo.'],
    ['minigame', 'Libera la tensión reventando burbujas.'],
    ['journaling', 'Ponle palabras a lo que te molestó.'],
    ['music', 'Música tranquila para soltar.'],
  ],
  fearful: [
    ['meditation', 'Respirar en ciclos te ancla al presente.'],
    ['journaling', 'Escribir tus preocupaciones les quita peso.'],
    ['music', 'Sonidos tranquilos para sentirte seguro.'],
    ['minigame', 'Enfoca tu atención en algo sencillo.'],
  ],
  disgusted: [
    ['minigame', 'Cambia de foco con un juego rápido.'],
    ['meditation', 'Una respiración para resetear.'],
    ['music', 'Música para cambiar el ambiente.'],
    ['journaling', 'Escribe qué te incomodó.'],
  ],
  surprised: [
    ['journaling', 'Escribe lo que te sorprendió para procesarlo.'],
    ['meditation', 'Una pausa para asimilar.'],
    ['minigame', 'Canaliza la sorpresa en un juego.'],
    ['music', 'Música para acompañar el momento.'],
  ],
  neutral: [
    ['meditation', 'Un momento de atención plena para tu día.'],
    ['journaling', 'Haz un chequeo rápido de cómo estás.'],
    ['music', 'Descubre música nueva.'],
    ['minigame', 'Un juego para activar tu mente.'],
  ],
};

export const JOURNAL_PROMPTS: Record<EmotionKey | 'free', string[]> = {
  happy: ['¿Qué fue lo mejor de tu día y por qué?', '¿A quién te gustaría agradecerle algo hoy?'],
  sad: ['¿Qué está pesando en tu mente ahora mismo?', 'Si un amigo se sintiera así, ¿qué le dirías?'],
  angry: ['¿Qué situación te hizo enojar? Descríbela sin juzgarte.', '¿Qué necesitabas en ese momento y no obtuviste?'],
  fearful: ['¿Qué te preocupa? Escribe lo peor y lo más probable que podría pasar.', '¿Qué está bajo tu control hoy?'],
  disgusted: ['¿Qué te incomodó y qué límite se cruzó?', '¿Qué te ayudaría a sentirte en paz con esto?'],
  surprised: ['¿Qué te sorprendió y cómo te hace sentir?', '¿Esto cambia algo de lo que esperabas?'],
  neutral: ['¿Cómo describirías tu día en tres palabras?', '¿Qué pequeña cosa podrías hacer hoy por ti?'],
  free: ['¿Cómo te sientes en este momento?', '¿Qué quieres recordar de hoy?'],
};

export interface RoleInfo { id: number; key: RoleKey; name: string; rank: number; description: string }
export const ROLES: RoleInfo[] = [
  { id: 1, key: 'guest', name: 'Invitado', rank: 0, description: 'Acceso de prueba con funciones limitadas.' },
  { id: 2, key: 'listener', name: 'Listener', rank: 10, description: 'Usuario estándar: detecta, realiza actividades y gana XP.' },
  { id: 3, key: 'curator', name: 'Curador', rank: 20, description: 'Gestiona el contenido: playlists de Spotify por emoción.' },
  { id: 4, key: 'moderator', name: 'Moderador', rank: 30, description: 'Revisa reportes y suspende cuentas.' },
  { id: 5, key: 'mentor', name: 'Mentor', rank: 40, description: 'Acompaña a sus personas asignadas; ve su historial solo con su permiso.' },
  { id: 6, key: 'analyst', name: 'Analista', rank: 50, description: 'Consulta el dashboard analítico agregado.' },
  { id: 7, key: 'admin', name: 'Administrador', rank: 60, description: 'Gestiona usuarios, roles, mentores y badges; ve analítica y moderación.' },
  { id: 8, key: 'superadmin', name: 'Superadmin', rank: 70, description: 'Todas las herramientas, incluida la gestión de administradores.' },
];
export const ROLE_BY_KEY = Object.fromEntries(ROLES.map((r) => [r.key, r])) as Record<RoleKey, RoleInfo>;

/** Permisos explícitos por rol (espejo de role_permissions en schema.sql). Todos los roles usan además la parte de bienestar. */
export type Perm = 'curate' | 'moderate' | 'mentor' | 'analytics' | 'manage_users' | 'manage_badges' | 'manage_admins';
export const ROLE_PERMS: Record<RoleKey, Perm[]> = {
  guest: [],
  listener: [],
  curator: ['curate'],
  moderator: ['moderate'],
  mentor: ['mentor'],
  analyst: ['analytics'],
  admin: ['manage_users', 'manage_badges', 'analytics', 'moderate'],
  superadmin: ['curate', 'moderate', 'mentor', 'analytics', 'manage_users', 'manage_badges', 'manage_admins'],
};
export const can = (role: RoleKey, perm: Perm) => ROLE_PERMS[role].includes(perm);
export const isStaff = (role: RoleKey) => ROLE_PERMS[role].length > 0;
/** El rango solo protege a los administradores: suspenderlos o cambiarles el rol requiere superadmin. */
export const isAdminRole = (role: RoleKey) => ROLE_BY_KEY[role].rank >= 60;
export const canSuspend = (me: RoleKey, target: RoleKey) =>
  (can(me, 'moderate') || can(me, 'manage_users')) && (!isAdminRole(target) || can(me, 'manage_admins'));

export const DEFAULT_BADGES: Badge[] = [
  { id: 1, key: 'first_wave', name: 'Primera ola', description: 'Realiza tu primera detección emocional.', icon: '🌊', xp_reward: 10, rule_type: 'detections', rule_activity_id: null, threshold: 1 },
  { id: 2, key: 'first_step', name: 'Primer paso', description: 'Completa tu primera actividad.', icon: '👣', xp_reward: 10, rule_type: 'completions', rule_activity_id: null, threshold: 1 },
  { id: 3, key: 'ten_activities', name: 'Constancia', description: 'Completa 10 actividades.', icon: '🏅', xp_reward: 25, rule_type: 'completions', rule_activity_id: null, threshold: 10 },
  { id: 4, key: 'pen', name: 'Pluma sincera', description: 'Escribe 5 entradas en tu diario.', icon: '✍️', xp_reward: 20, rule_type: 'activity', rule_activity_id: 2, threshold: 5 },
  { id: 5, key: 'zen', name: 'Mente en calma', description: 'Completa 5 meditaciones.', icon: '🧘', xp_reward: 20, rule_type: 'activity', rule_activity_id: 3, threshold: 5 },
  { id: 6, key: 'gamer', name: 'Revientaburbujas', description: 'Juega 5 veces el minijuego.', icon: '🫧', xp_reward: 20, rule_type: 'activity', rule_activity_id: 1, threshold: 5 },
  { id: 7, key: 'dj', name: 'Oído emocional', description: 'Escucha 5 playlists.', icon: '🎧', xp_reward: 20, rule_type: 'activity', rule_activity_id: 4, threshold: 5 },
  { id: 8, key: 'streak_3', name: 'Racha de 3', description: 'Mantén una racha de 3 días.', icon: '🔥', xp_reward: 15, rule_type: 'streak', rule_activity_id: null, threshold: 3 },
  { id: 9, key: 'streak_7', name: 'Semana completa', description: 'Mantén una racha de 7 días.', icon: '⚡', xp_reward: 30, rule_type: 'streak', rule_activity_id: null, threshold: 7 },
  { id: 10, key: 'streak_30', name: 'Hábito de acero', description: 'Mantén una racha de 30 días.', icon: '💎', xp_reward: 50, rule_type: 'streak', rule_activity_id: null, threshold: 30 },
  { id: 11, key: 'explorer', name: 'Explorador', description: 'Prueba las 4 actividades.', icon: '🧭', xp_reward: 20, rule_type: 'distinct_activities', rule_activity_id: null, threshold: 4 },
  { id: 12, key: 'rainbow', name: 'Arcoíris emocional', description: 'Registra las 7 emociones.', icon: '🌈', xp_reward: 30, rule_type: 'distinct_emotions', rule_activity_id: null, threshold: 7 },
  { id: 13, key: 'level_5', name: 'Oleaje', description: 'Alcanza el nivel 5.', icon: '⭐', xp_reward: 0, rule_type: 'level', rule_activity_id: null, threshold: 5 },
  { id: 14, key: 'level_10', name: 'Leyenda MoodWave', description: 'Alcanza el nivel 10.', icon: '👑', xp_reward: 0, rule_type: 'level', rule_activity_id: null, threshold: 10 },
];

export const DEFAULT_PLAYLISTS: Playlist[] = [
  { emotion: 'happy', spotify_playlist_id: '37i9dQZF1DXdPec7aLTmlC', title: 'Happy Hits!' },
  { emotion: 'sad', spotify_playlist_id: '37i9dQZF1DX4sWSpwq3LiO', title: 'Peaceful Piano' },
  { emotion: 'angry', spotify_playlist_id: '37i9dQZF1DX4sWSpwq3LiO', title: 'Peaceful Piano' },
  { emotion: 'fearful', spotify_playlist_id: '37i9dQZF1DX4sWSpwq3LiO', title: 'Peaceful Piano' },
  { emotion: 'disgusted', spotify_playlist_id: '37i9dQZF1DX3rxVfibe1L0', title: 'Mood Booster' },
  { emotion: 'surprised', spotify_playlist_id: '37i9dQZF1DX3rxVfibe1L0', title: 'Mood Booster' },
  { emotion: 'neutral', spotify_playlist_id: '37i9dQZF1DWZeKCadgRdKQ', title: 'Deep Focus' },
];
