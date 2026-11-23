import { describe, expect, it } from 'vitest';
import { euclidean, isValidDescriptor, matchFace, meanDescriptor } from './faceAuth';

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
