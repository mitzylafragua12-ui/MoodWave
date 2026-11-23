/**
 * Lógica pura del inicio de sesión con rostro (sin navegador, con pruebas).
 * Portada del prototipo anterior del equipo: plantilla de 128 números promediada,
 * e identificación 1:N con umbral estricto.
 */

export const DESCRIPTOR_LENGTH = 128;
/** 0.6 es el valor clásico de face-api; 0.45 es más estricto (menos falsos positivos). */
export const FACE_THRESHOLD = 0.45;
export const ENROLL_SAMPLES = 7;
export const LOGIN_SAMPLES = 5;

export function euclidean(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (!a || !b || a.length !== b.length) throw new Error('descriptores incompatibles');
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}

/** Promedia varias capturas de la misma cara: baja el ruido de una sola foto. */
export function meanDescriptor(list: ArrayLike<number>[]): number[] {
  if (!list.length) throw new Error('sin descriptores');
  const n = list[0].length;
  const out = new Array<number>(n).fill(0);
  for (const d of list) {
    if (d.length !== n) throw new Error('descriptores de distinto tamaño');
    for (let i = 0; i < n; i++) out[i] += d[i];
  }
  return out.map((v) => v / list.length);
}

export function isValidDescriptor(d: unknown): d is number[] {
  return Array.isArray(d) && d.length === DESCRIPTOR_LENGTH && d.every((x) => typeof x === 'number' && Number.isFinite(x));
}

/** Devuelve el candidato más parecido dentro del umbral, o null. */
export function matchFace<T extends { descriptor: ArrayLike<number> | null }>(
  descriptor: ArrayLike<number>, candidates: T[], threshold = FACE_THRESHOLD,
): { candidate: T; distance: number } | null {
  let best: { candidate: T; distance: number } | null = null;
  for (const c of candidates) {
    if (!c.descriptor) continue;
    const distance = euclidean(descriptor, c.descriptor);
    if (!best || distance < best.distance) best = { candidate: c, distance };
  }
  return best && best.distance <= threshold ? best : null;
}
