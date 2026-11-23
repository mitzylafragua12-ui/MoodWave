import { describe, expect, it } from 'vitest';
import { GAMES, GAMES_FOR_EMOTION, nextGameFor } from './index';
import { EMOTIONS } from '../../../lib/catalog';

describe('juegos por emoción', () => {
  it('hay 4 juegos para cada una de las 7 emociones', () => {
    for (const e of EMOTIONS) expect(GAMES_FOR_EMOTION[e.key]).toHaveLength(4);
    expect(GAMES).toHaveLength(28);
  });
  it('las claves son únicas y caben en la base (≤ 40 caracteres)', () => {
    const keys = GAMES.map((g) => g.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((k) => k.length <= 40)).toBe(true);
  });
  it('recomienda un juego de la emoción detectada', () => {
    for (const e of EMOTIONS) expect(nextGameFor(e.key).emotion).toBe(e.key);
  });
});
