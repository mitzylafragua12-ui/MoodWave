import { describe, expect, it } from 'vitest';
import { detectBlink, euclidean, eyeAspectRatio, isValidDescriptor, matchFace, meanDescriptor } from './faceAuth';

const vec = (v: number) => new Array(128).fill(v);

describe('descriptores', () => {
  it('distancia euclidiana', () => {
    expect(euclidean([0, 0], [3, 4])).toBe(5);
    expect(() => euclidean([1], [1, 2])).toThrow();
  });
  it('promedia capturas', () => {
    expect(meanDescriptor([[0, 2], [2, 4]])).toEqual([1, 3]);
  });
  it('valida longitud y números finitos', () => {
    expect(isValidDescriptor(vec(0.1))).toBe(true);
    expect(isValidDescriptor(vec(0.1).slice(1))).toBe(false);
    expect(isValidDescriptor([...vec(0.1).slice(1), NaN])).toBe(false);
  });
  it('identifica al más parecido dentro del umbral', () => {
    const users = [{ id: 'a', descriptor: vec(0) }, { id: 'b', descriptor: vec(0.03) }, { id: 'c', descriptor: null }];
    expect(matchFace(vec(0.031), users)?.candidate.id).toBe('b');
    // 0.2 por componente → distancia ≈ 2.26: nadie
    expect(matchFace(vec(0.2), users)).toBeNull();
  });
});

describe('prueba de vida', () => {
  const eye = (h: number) => [{ x: 0, y: 0 }, { x: 1, y: -h }, { x: 2, y: -h }, { x: 3, y: 0 }, { x: 2, y: h }, { x: 1, y: h }];
  it('EAR baja al cerrar el ojo', () => {
    expect(eyeAspectRatio(eye(0.5))).toBeCloseTo(1 / 3);
    expect(eyeAspectRatio(eye(0.1))).toBeLessThan(0.1);
  });
  it('detecta abierto → cerrado → abierto', () => {
    expect(detectBlink([0.3, 0.31, 0.12, 0.3])).toBe(true);
  });
  it('una foto (EAR plano) no pasa', () => {
    expect(detectBlink([0.3, 0.29, 0.3, 0.3, 0.29, 0.3])).toBe(false);
  });
  it('ojos cerrados sin volver a abrir no pasa', () => {
    expect(detectBlink([0.3, 0.3, 0.1, 0.1])).toBe(false);
  });
  it('se adapta a ojos más rasgados (umbral relativo)', () => {
    expect(detectBlink([0.2, 0.21, 0.13, 0.2])).toBe(true);
  });
});
