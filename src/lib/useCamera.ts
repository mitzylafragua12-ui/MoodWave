import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../i18n';

export type CameraState = 'off' | 'starting' | 'on' | 'error';

export function cameraError(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return t('Permiso de cámara denegado. Habilítalo en tu navegador y vuelve a intentar.');
  if (name === 'NotFoundError') return t('No se encontró ninguna cámara.');
  if (!navigator.mediaDevices?.getUserMedia) return t('Tu navegador no permite usar la cámara aquí (se requiere HTTPS).');
  return t('No se pudo abrir la cámara: {error}', { error: (e as Error)?.message ?? String(e) });
}

/** Cámara frontal ligada a un <video>; se apaga sola al desmontar. */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>('off');
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState('off');
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current && videoRef.current?.srcObject) return true;
    setState('starting'); setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('sin getUserMedia');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play().catch(() => {});
      if (v.readyState < 2) await new Promise((r) => v.addEventListener('loadeddata', r, { once: true }));
      setState('on');
      return true;
    } catch (e) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setError(cameraError(e)); setState('error');
      return false;
    }
  }, []);

  useEffect(() => stop, [stop]);
  return { videoRef, state, error, start, stop };
}
