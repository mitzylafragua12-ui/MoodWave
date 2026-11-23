/**
 * Detección emocional con face-api.js (fork mantenido @vladmandic/face-api).
 * Todo corre en el navegador: ningún fotograma sale del dispositivo (RNF-01).
 */
import type { EmotionKey } from './types';
import { asset } from './paths';

type FaceApi = typeof import('@vladmandic/face-api');
let faceapi: FaceApi | null = null;
let loading: Promise<FaceApi> | null = null;

export const EMOTION_KEYS: EmotionKey[] = ['happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised', 'neutral'];

/** Tamaño de entrada del detector. Debe ser el mismo en el calentamiento y en la detección. */
const DETECT_SIZE = 224;
const detectOptions = (lib: FaceApi) => new lib.TinyFaceDetectorOptions({ inputSize: DETECT_SIZE, scoreThreshold: 0.45 });

/**
 * Carga la librería y los modelos (TinyFaceDetector + FaceExpressionNet, ~0.5 MB) y los CALIENTA:
 * la primera inferencia compila los programas de la tarjeta gráfica y tarda segundos; haciéndola
 * aquí, con una imagen vacía, la primera lectura real con la cámara ya es inmediata.
 */
export function loadFaceApi(): Promise<FaceApi> {
  if (faceapi) return Promise.resolve(faceapi);
  loading ??= (async () => {
    const lib = await import('@vladmandic/face-api');
    await (lib.tf as unknown as { ready: () => Promise<void> }).ready();
    await Promise.all([
      lib.nets.tinyFaceDetector.loadFromUri(asset('models')),
      lib.nets.faceExpressionNet.loadFromUri(asset('models')),
    ]);
    try {
      const c = document.createElement('canvas');
      c.width = 640; c.height = 480;
      c.getContext('2d')!.fillRect(0, 0, c.width, c.height);
      await lib.detectSingleFace(c, detectOptions(lib)); // compila el detector
      const t = lib.tf.zeros([1, 112, 112, 3]);
      await lib.nets.faceExpressionNet.predictExpressions(t as never); // compila la red de expresiones
      t.dispose();
    } catch { /* el calentamiento es opcional */ }
    faceapi = lib;
    return lib;
  })();
  loading.catch(() => { loading = null; });
  return loading;
}

/** Precarga en segundo plano (cuando el navegador está libre) para que «Detectar» sea instantáneo. */
export function preloadFaceApi(delayMs = 800) {
  if (faceapi || loading) return;
  const go = () => { loadFaceApi().catch(() => {}); };
  const idle = (window as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
  setTimeout(() => (idle ? idle(go, { timeout: 2500 }) : go()), delayMs);
}

export type Scores = Record<EmotionKey, number>;

export async function detectExpressions(input: HTMLVideoElement): Promise<Scores | null> {
  const lib = await loadFaceApi();
  const result = await lib
    .detectSingleFace(input, detectOptions(lib))
    .withFaceExpressions();
  if (!result) return null;
  const out = {} as Scores;
  for (const k of EMOTION_KEYS) out[k] = result.expressions[k] ?? 0;
  return out;
}

/** Promedio móvil de las últimas N lecturas para estabilizar el resultado. */
export class ExpressionSmoother {
  private buf: Scores[] = [];
  constructor(private size = 6) {}
  push(s: Scores) {
    this.buf.push(s);
    if (this.buf.length > this.size) this.buf.shift();
  }
  clear() { this.buf = []; }
  get count() { return this.buf.length; }
  /** Con 3 lecturas seguidas ya hay un resultado fiable (antes se esperaban 5). */
  get stable() { return this.buf.length >= Math.min(3, this.size); }
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

/** Modelos extra para identidad: landmarks (para alinear la cara) y reconocimiento. */
export function loadFaceAuthModels(): Promise<void> {
  authModels ??= (async () => {
    const lib = await loadFaceApi();
    await Promise.all([
      lib.nets.faceLandmark68Net.loadFromUri(asset('models')),
      lib.nets.faceRecognitionNet.loadFromUri(asset('models')),
    ]);
  })();
  authModels.catch(() => { authModels = null; });
  return authModels;
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
