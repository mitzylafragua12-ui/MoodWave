/**
 * Lógica pura del inicio de sesión con rostro (sin navegador, con pruebas).
 * Portada del prototipo anterior del equipo: plantilla de 128 números promediada,
 * identificación 1:N con umbral estricto y prueba de vida por parpadeo (EAR).
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

export interface Point { x: number; y: number }

/** Eye Aspect Ratio: alto del ojo entre su ancho (6 puntos del modelo de 68). Al parpadear cae en picado. */
export function eyeAspectRatio(eye: Point[]): number {
  if (eye.length !== 6) throw new Error('el ojo necesita 6 puntos');
  const d = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  const ancho = d(eye[0], eye[3]);
  if (!ancho) return 0;
  return (d(eye[1], eye[5]) + d(eye[2], eye[4])) / (2 * ancho);
}

/**
 * Un parpadeo real es abierto → cerrado → abierto; una foto tiene un EAR plano.
 * Los umbrales son relativos al ojo abierto de CADA persona (máximo observado), para que
 * funcione con gafas u ojos más rasgados.
 */
export function detectBlink(ears: number[], closedRatio = 0.8, openRatio = 0.92): boolean {
  if (ears.length < 4) return false;
  const base = Math.max(...ears);
  if (base <= 0.1) return false;
  const closed = base * closedRatio;
  const open = base * openRatio;
  let abierto = false;
  let cerrado = false;
  for (const e of ears) {
    if (!abierto) { if (e > open) abierto = true; continue; }
    if (!cerrado) { if (e < closed) cerrado = true; continue; }
    if (e > open) return true;
  }
  return false;
}
