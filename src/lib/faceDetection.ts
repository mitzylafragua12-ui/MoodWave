/**
 * Detección emocional con face-api.js (fork mantenido @vladmandic/face-api).
 * Todo corre en el navegador: ningún fotograma sale del dispositivo (RNF-01).
 */
import type { EmotionKey } from './types';
import { detectBlink, eyeAspectRatio } from './faceAuth';
import { asset } from './paths';

type FaceApi = typeof import('@vladmandic/face-api');
let faceapi: FaceApi | null = null;
let loading: Promise<FaceApi> | null = null;

export const EMOTION_KEYS: EmotionKey[] = ['happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised', 'neutral'];

/** Carga perezosa de la librería y los modelos (TinyFaceDetector + FaceExpressionNet, ~0.5 MB). */
export function loadFaceApi(): Promise<FaceApi> {
  if (faceapi) return Promise.resolve(faceapi);
  loading ??= (async () => {
    const lib = await import('@vladmandic/face-api');
    await (lib.tf as unknown as { ready: () => Promise<void> }).ready();
    await Promise.all([
      lib.nets.tinyFaceDetector.loadFromUri(asset('models')),
      lib.nets.faceExpressionNet.loadFromUri(asset('models')),
    ]);
    faceapi = lib;
    return lib;
  })();
  loading.catch(() => { loading = null; });
  return loading;
}

export type Scores = Record<EmotionKey, number>;

export async function detectExpressions(input: HTMLVideoElement): Promise<Scores | null> {
  const lib = await loadFaceApi();
  const result = await lib
    .detectSingleFace(input, new lib.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 }))
    .withFaceExpressions();
  if (!result) return null;
  const out = {} as Scores;
  for (const k of EMOTION_KEYS) out[k] = result.expressions[k] ?? 0;
  return out;
}

/** Promedio móvil de las últimas N lecturas para estabilizar el resultado. */
export class ExpressionSmoother {
  private buf: Scores[] = [];
  constructor(private size = 8) {}
  push(s: Scores) {
    this.buf.push(s);
    if (this.buf.length > this.size) this.buf.shift();
  }
  clear() { this.buf = []; }
  get count() { return this.buf.length; }
  get stable() { return this.buf.length >= Math.min(5, this.size); }
  average(): Scores | null {
    if (!this.buf.length) return null;
    const out = {} as Scores;
    for (const k of EMOTION_KEYS) out[k] = this.buf.reduce((s, b) => s + b[k], 0) / this.buf.length;
    return out;
  }
}

export function dominant(s: Scores): { emotion: EmotionKey; confidence: number } {
  let best: EmotionKey = 'neutral';
  for (const k of EMOTION_KEYS) if (s[k] > s[best]) best = k;
  return { emotion: best, confidence: s[best] };
}

// ---------------------------------------------------------------- inicio de sesión con rostro

let authModels: Promise<void> | null = null;

/** Modelos extra para identidad: landmarks (tiny para parpadeo, completo para alinear) y reconocimiento. */
export function loadFaceAuthModels(): Promise<void> {
  authModels ??= (async () => {
    const lib = await loadFaceApi();
    await Promise.all([
      lib.nets.faceLandmark68TinyNet.loadFromUri(asset('models')),
      lib.nets.faceLandmark68Net.loadFromUri(asset('models')),
      lib.nets.faceRecognitionNet.loadFromUri(asset('models')),
    ]);
  })();
  authModels.catch(() => { authModels = null; });
  return authModels;
}

export interface BlinkFrame { face: boolean; eyesClosed: boolean; fps: number }

/**
 * Prueba de vida: espera un parpadeo. Un parpadeo dura 0,1–0,4 s, así que va rápido:
 * landmarks pequeños y entrada de 224 px, sin descriptor ni expresiones.
 */
export async function waitBlink(video: HTMLVideoElement, opts: {
  timeoutMs?: number; onFrame?: (f: BlinkFrame) => void; signal?: AbortSignal;
} = {}): Promise<{ ok: boolean; seen: number }> {
  const lib = await loadFaceApi();
  await loadFaceAuthModels();
  // 224 px: casi igual de rápido que 192 y bastante más robusto con caras inclinadas.
  const fast = new lib.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
  const ears: number[] = [];
  const t0 = performance.now();
  let frames = 0;
  while (performance.now() - t0 < (opts.timeoutMs ?? 12000)) {
    if (opts.signal?.aborted) break;
    const r = await lib.detectSingleFace(video, fast).withFaceLandmarks(true);
    frames++;
    const fps = Math.round(frames / ((performance.now() - t0) / 1000));
    if (!r) { opts.onFrame?.({ face: false, eyesClosed: false, fps }); continue; }
    const ear = (eyeAspectRatio(r.landmarks.getLeftEye()) + eyeAspectRatio(r.landmarks.getRightEye())) / 2;
    ears.push(ear);
    const base = Math.max(...ears);
    opts.onFrame?.({ face: true, eyesClosed: ear < base * 0.8, fps });
    if (detectBlink(ears)) return { ok: true, seen: ears.length };
  }
  return { ok: false, seen: ears.length };
}

/** Toma n capturas con descriptor facial (128 números) para promediarlas. */
export async function sampleDescriptors(video: HTMLVideoElement, n: number, onTick?: (i: number, n: number, ok: boolean) => void): Promise<number[][]> {
  const lib = await loadFaceApi();
  await loadFaceAuthModels();
  // 224 px es más robusto que 320 con caras inclinadas (medido: 0.85 vs 0.23 de confianza).
  const opts = new lib.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const r = await lib.detectSingleFace(video, opts).withFaceLandmarks().withFaceDescriptor();
    if (r) out.push(Array.from(r.descriptor));
    onTick?.(i + 1, n, !!r);
  }
  return out;
}
