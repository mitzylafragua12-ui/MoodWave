import { useEffect, useState, type CSSProperties } from 'react';
import { api } from '../lib/api';
import { useCamera } from '../lib/useCamera';
import { loadFaceAuthModels, sampleDescriptors } from '../lib/faceDetection';
import { LOGIN_SAMPLES, meanDescriptor } from '../lib/faceAuth';
import { errMsg } from '../context/ToastContext';
import { ErrorBox } from './ui';

export const FACE_DEVICE_KEY = 'mw-face-device';
export function markFaceDevice(on: boolean) {
  try { if (on) localStorage.setItem(FACE_DEVICE_KEY, '1'); else localStorage.removeItem(FACE_DEVICE_KEY); } catch { /* sin almacenamiento */ }
}
export function isFaceDevice() {
  try { return localStorage.getItem(FACE_DEVICE_KEY) === '1'; } catch { return false; }
}

type Step = 'idle' | 'starting' | 'identifying' | 'entering';
const IDLE_HINT = 'Mira de frente a la cámara y pulsa «Identificarme».';

/** Entrar con el rostro: captura estática + identificación 1:N (sin prueba de parpadeo). */
export function FaceLoginPanel({ onSuccess }: { onSuccess: () => void }) {
  const cam = useCamera();
  const [step, setStep] = useState<Step>('idle');
  const [hint, setHint] = useState(IDLE_HINT);
  const [error, setError] = useState<string | null>(null);

  // Precarga los modelos mientras la persona lee la pantalla.
  useEffect(() => { loadFaceAuthModels().catch(() => {}); }, []);

  async function identify() {
    setError(null);
    setStep('starting');
    setHint('Abriendo cámara y cargando modelos (la primera vez tarda unos segundos)…');
    if (!(await cam.start())) { setStep('idle'); setHint(IDLE_HINT); return; }
    try {
      await loadFaceAuthModels();
      setStep('identifying');
      const descs = await sampleDescriptors(cam.videoRef.current!, LOGIN_SAMPLES,
        (i, n, ok) => setHint(`Identificando ${i}/${n}${ok ? '' : ' — no veo tu cara'}`));
      if (descs.length < 3) throw new Error('No pude ver bien tu cara. Acércate, ponte de frente y busca luz.');
      setStep('entering');
      setHint('¡Te reconocí! Entrando…');
      await api.faceLogin(meanDescriptor(descs));
      markFaceDevice(true);
      cam.stop();
      onSuccess();
    } catch (e) {
      setError(errMsg(e));
      setStep('idle');
      setHint(IDLE_HINT);
    }
  }

  const busy = step !== 'idle';
  return (
    <div>
      <div className="camera-frame face-cam" style={{ '--frame': step === 'entering' ? 'var(--green)' : 'var(--cyan)' } as CSSProperties}>
        <video ref={cam.videoRef} playsInline muted aria-label="Cámara para identificarte" />
        {cam.state !== 'on' && (
          <div className="camera-overlay"><div className="stack" style={{ alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: '2.6rem' }} aria-hidden>🙂</div>
            <p className="small muted mb0">Tu rostro se analiza en este dispositivo. Solo se envía una plantilla numérica para reconocerte.</p>
          </div></div>
        )}
        {step === 'identifying' && <div className="camera-status chip"><span className="live-dot" />Identificando…</div>}
      </div>
      <p className="small muted center" aria-live="polite" style={{ margin: '10px 0' }}>{hint}</p>
      <ErrorBox error={error || cam.error} />
      <button type="button" className="btn btn-cyan btn-block mt" onClick={identify} disabled={busy}>
        {step === 'idle' ? '🙂 Identificarme' : step === 'entering' ? 'Entrando…' : 'Un momento…'}
      </button>
    </div>
  );
}
