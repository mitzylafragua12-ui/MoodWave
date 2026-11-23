import { describe, expect, it } from 'vitest';
import { addDays, cappedGrant, effectiveStreak, levelForXp, levelProgress, nextStreak } from './gamification';

describe('niveles', () => {
  it('mapea XP a 10 niveles', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(1000)).toBe(6);
    expect(levelForXp(99999)).toBe(10);
  });
  it('calcula progreso', () => {
    expect(levelProgress(175)).toMatchObject({ level: 2, next: 250, toNext: 75 });
    expect(levelProgress(5000).next).toBeNull();
  });
});

describe('tope diario', () => {
  it('limita a 200 XP por día', () => {
    expect(cappedGrant(50, 0)).toBe(50);
    expect(cappedGrant(50, 180)).toBe(20);
    expect(cappedGrant(50, 200)).toBe(0);
  });
});

describe('rachas', () => {
  it('incrementa en días consecutivos y reinicia tras un hueco', () => {
    expect(nextStreak(0, null, '2026-11-23')).toBe(1);
    expect(nextStreak(3, '2026-11-22', '2026-11-23')).toBe(4);
    expect(nextStreak(3, '2026-11-23', '2026-11-23')).toBe(3);
    expect(nextStreak(3, '2026-11-20', '2026-11-23')).toBe(1);
  });
  it('cruza fin de mes', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(nextStreak(5, '2026-12-31', '2027-01-01')).toBe(6);
  });
  it('muestra la racha vencida como 0', () => {
    expect(effectiveStreak(4, '2026-11-22', '2026-11-23')).toBe(4);
    expect(effectiveStreak(4, '2026-11-20', '2026-11-23')).toBe(0);
  });
});
