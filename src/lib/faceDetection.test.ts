import { describe, expect, it } from 'vitest';
import { ExpressionWindow, EMOTION_KEYS, type Scores } from './faceDetection';

const sc = (emotion: string, v = 0.9): Scores =>
  Object.fromEntries(EMOTION_KEYS.map((k) => [k, k === emotion ? v : (1 - v) / 6])) as Scores;

describe('ventana de análisis emocional', () => {
  it('no da resultado antes de 6 s con la cara a cuadro', () => {
    const w = new ExpressionWindow();
    for (let t = 0; t <= 5800; t += 200) w.push(sc('happy'), t);
    expect(w.seconds).toBeCloseTo(5.8);
    expect(w.complete).toBe(false);
    w.push(sc('happy'), 6000);
    expect(w.complete).toBe(true);
  });

  it('pausa el reloj cuando no se ve la cara', () => {
    const w = new ExpressionWindow();
    for (let t = 0; t <= 3000; t += 200) w.push(sc('sad'), t);
    w.push(null, 3200); w.push(null, 9000);
    w.push(sc('sad'), 10000);
    expect(w.seconds).toBeCloseTo(3);
    expect(w.complete).toBe(false);
  });

  it('exige un mínimo de lecturas aunque pase el tiempo', () => {
    const w = new ExpressionWindow();
    for (let t = 0; t <= 7500; t += 1500) w.push(sc('angry'), t); // 6 lecturas en 7.5 s
    expect(w.seconds).toBeGreaterThanOrEqual(6);
    expect(w.complete).toBe(false);
  });

  it('promedia toda la ventana: una mueca suelta no cambia la emoción', () => {
    const w = new ExpressionWindow();
    for (let t = 0; t <= 6000; t += 200) w.push(t === 3000 ? sc('surprised', 1) : sc('neutral', 0.7), t);
    const avg = w.average()!;
    expect(avg.neutral).toBeGreaterThan(avg.surprised);
  });
});
