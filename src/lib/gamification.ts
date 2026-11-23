// Reglas de gamificación (espejo de las funciones SQL level_for_xp / grant_xp / evaluate_badges).
import type { Badge, BadgeRule } from './types';

export const DAILY_XP_CAP = 200;
export const DAILY_CHECKIN_XP = 10;

/** XP mínimo para alcanzar cada nivel (índice 0 = nivel 1). */
export const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200] as const;
export const LEVEL_NAMES = [
  'Brisa', 'Onda', 'Marea', 'Corriente', 'Oleaje',
  'Rompiente', 'Surfista', 'Tsunami zen', 'Océano', 'Leyenda MoodWave',
] as const;
export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  return level;
}

/** Progreso dentro del nivel actual (0..1) y XP para el siguiente. */
export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  if (level >= MAX_LEVEL) return { level, current: xp, next: null as number | null, ratio: 1, toNext: 0 };
  const start = LEVEL_THRESHOLDS[level - 1];
  const next = LEVEL_THRESHOLDS[level];
  return { level, current: xp, next, ratio: (xp - start) / (next - start), toNext: next - xp };
}

export function cappedGrant(amount: number, earnedToday: number): number {
  return Math.max(0, Math.min(amount, DAILY_XP_CAP - earnedToday));
}

/** Calcula la nueva racha a partir del último día activo (fechas YYYY-MM-DD). */
export function nextStreak(streak: number, lastActive: string | null, today: string): number {
  if (lastActive === today) return streak;
  if (lastActive && addDays(lastActive, 1) === today) return streak + 1;
  return 1;
}

/** Racha mostrada: si no hubo actividad ayer ni hoy, la racha está vencida. */
export function effectiveStreak(streak: number, lastActive: string | null, today: string): number {
  if (!lastActive) return 0;
  return lastActive === today || addDays(lastActive, 1) === today ? streak : 0;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return date.toISOString().slice(0, 10);
}

export interface BadgeStats {
  detections: number;
  completions: number;
  perActivity: Record<number, number>;
  streak: number;
  level: number;
  distinctEmotions: number;
  distinctActivities: number;
}

export function badgeValue(rule: BadgeRule, activityId: number | null, s: BadgeStats): number {
  switch (rule) {
    case 'detections': return s.detections;
    case 'completions': return s.completions;
    case 'activity': return activityId ? s.perActivity[activityId] ?? 0 : 0;
    case 'streak': return s.streak;
    case 'level': return s.level;
    case 'distinct_emotions': return s.distinctEmotions;
    case 'distinct_activities': return s.distinctActivities;
  }
}

export function badgeProgress(b: Badge, s: BadgeStats) {
  const value = Math.min(badgeValue(b.rule_type, b.rule_activity_id, s), b.threshold);
  return { value, ratio: value / b.threshold, done: value >= b.threshold };
}
