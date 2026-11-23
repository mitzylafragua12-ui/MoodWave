import { useEffect, useState, type CSSProperties } from 'react';
import { api } from '../lib/api';
import { useCamera } from '../lib/useCamera';
import { loadFaceAuthModels, sampleDescriptors } from '../lib/faceDetection';
import { LOGIN_SAMPLES, meanDescriptor } from '../lib/faceAuth';
import { errMsg } from '../context/ToastContext';
import { ErrorBox } from './ui';
import { t } from '../i18n';

export const FACE_DEVICE_KEY = 'mw-face-device';
export function markFaceDevice(on: boolean) {
  try { if (on) localStorage.setItem(FACE_DEVICE_KEY, '1'); else localStorage.removeItem(FACE_DEVICE_KEY); } catch { /* sin almacenamiento */ }
}
export function isFaceDevice() {
  try { return localStorage.getItem(FACE_DEVICE_KEY) === '1'; } catch { return false; }
}

type Step = 'idle' | 'starting' | 'identifying' | 'entering';
const IDLE_HINT = 'Mira de frente a la cámara y pulsa «Identificarme».'; // se traduce al mostrarse

/** Entrar con el rostro: captura estática + identificación 1:N (sin prueba de parpadeo). */
export function FaceLoginPanel({ onSuccess }: { onSuccess: () => void }) {
  const cam = useCamera();
  const [step, setStep] = useState<Step>('idle');
  const [hint, setHint] = useState(t(IDLE_HINT));
  const [error, setError] = useState<string | null>(null);

  // Precarga los modelos mientras la persona lee la pantalla.
  useEffect(() => { loadFaceAuthModels().catch(() => {}); }, []);

  async function identify() {
    setError(null);
    setStep('starting');
    setHint(t('Abriendo cámara y cargando modelos (la primera vez tarda unos segundos)…'));
    if (!(await cam.start())) { setStep('idle'); setHint(t(IDLE_HINT)); return; }
    try {
      await loadFaceAuthModels();
      setStep('identifying');
      const descs = await sampleDescriptors(cam.videoRef.current!, LOGIN_SAMPLES,
        (i, n, ok) => setHint(t(ok ? 'Identificando {i}/{n}' : 'Identificando {i}/{n} — no veo tu cara', { i, n })));
      if (descs.length < 3) throw new Error(t('No pude ver bien tu cara. Acércate, ponte de frente y busca luz.'));
      setStep('entering');
      setHint(t('¡Te reconocí! Entrando…'));
      await api.faceLogin(meanDescriptor(descs));
      markFaceDevice(true);
      cam.stop();
      onSuccess();
    } catch (e) {
      setError(errMsg(e));
      setStep('idle');
      setHint(t(IDLE_HINT));
    }
  }

  const busy = step !== 'idle';
  return (
    <div>
      <div className="camera-frame face-cam" style={{ '--frame': step === 'entering' ? 'var(--green)' : 'var(--cyan)' } as CSSProperties}>
        <video ref={cam.videoRef} playsInline muted aria-label={t('Cámara para identificarte')} />
        {cam.state !== 'on' && (
          <div className="camera-overlay"><div className="stack" style={{ alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: '2.6rem' }} aria-hidden>🙂</div>
            <p className="small muted mb0">{t('Tu rostro se analiza en este dispositivo. Solo se envía una plantilla numérica para reconocerte.')}</p>
          </div></div>
        )}
        {step === 'identifying' && <div className="camera-status chip"><span className="live-dot" />{t('Identificando…')}</div>}
      </div>
      <p className="small muted center" aria-live="polite" style={{ margin: '10px 0' }}>{hint}</p>
      <ErrorBox error={error || cam.error} />
      <button type="button" className="btn btn-cyan btn-block mt" onClick={identify} disabled={busy}>
        {step === 'idle' ? t('🙂 Identificarme') : step === 'entering' ? t('Entrando…') : t('Un momento…')}
      </button>
    </div>
  );
}
