import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useCamera } from '../lib/useCamera';
import { useProfile } from '../context/AuthContext';
import { errMsg, useToast } from '../context/ToastContext';
import { sampleDescriptors } from '../lib/faceDetection';
import { ENROLL_SAMPLES, meanDescriptor } from '../lib/faceAuth';
import { fmtDate } from '../lib/date';
import { markFaceDevice } from './FaceLoginPanel';
import { ErrorBox } from './ui';
import { t } from '../i18n';

/** Registrar, reemplazar o borrar la plantilla facial propia (con consentimiento explícito). */
export function FaceEnrollCard() {
  const me = useProfile();
  const toast = useToast();
  const cam = useCamera();
  const status = useAsync(() => api.getFaceStatus(), []);
  const [consent, setConsent] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(t('Mira de frente, sin gorra ni cubrebocas, con luz de frente.'));
  const [error, setError] = useState<string | null>(null);
  const enrolled = status.data?.enrolled;
  const cardRef = useRef<HTMLDivElement>(null);
  // Llegando desde «Registrar mi rostro» en el inicio (/perfil#rostro).
  useEffect(() => { if (window.location.hash === '#rostro') cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, []);

  async function capture() {
    setBusy(true); setError(null);
    try {
      if (!(await cam.start())) return;
      setHint(t('Cargando modelos…'));
      const descs = await sampleDescriptors(cam.videoRef.current!, ENROLL_SAMPLES,
        (i, n, ok) => setHint(t(ok ? 'Captura {i}/{n}' : 'Captura {i}/{n} — no veo tu cara', { i, n })));
      if (descs.length < 4) throw new Error(t('No conseguí capturas buenas. Busca luz de frente e inténtalo otra vez.'));
      await api.enrollFace(meanDescriptor(descs));
      markFaceDevice(true);
      cam.stop(); setOpen(false); setConsent(false);
      setHint(t('Mira de frente, sin gorra ni cubrebocas, con luz de frente.'));
      toast(t('Rostro registrado: ya puedes entrar con tu cara'));
      status.reload();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }

  async function remove() {
    if (!confirm(t('¿Borrar tu plantilla facial? Después entrarás solo con contraseña.'))) return;
    try { await api.deleteFace(); markFaceDevice(false); toast(t('Plantilla facial borrada')); status.reload(); }
    catch (e) { toast(errMsg(e), 'error'); }
  }

  if (me.role === 'guest') {
    return <div className="card"><h3>{t('🙂 Entrar con mi rostro')}</h3><p className="small muted mb0">{t('Crea una cuenta para poder registrar tu rostro.')}</p></div>;
  }

  return (
    <div className="card" id="rostro" ref={cardRef}>
      <div className="spread">
        <h3 className="mb0">{t('🙂 Entrar con mi rostro')}</h3>
        {status.data && <span className="chip" style={{ color: enrolled ? 'var(--green)' : 'var(--muted)' }}>{enrolled ? t('Activo') : t('Sin registrar')}</span>}
      </div>
      <p className="small muted mt">
        {enrolled
          ? t('Registrado el {date}. Para entrar solo tienes que mirar a la cámara.', { date: fmtDate(status.data!.updated_at!) })
          : t('Registra tu rostro para iniciar sesión sin contraseña: solo mira a la cámara y listo.')}
      </p>
      {!open ? (
        <div className="row">
          <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>{enrolled ? t('Volver a registrar') : t('Registrar mi rostro')}</button>
          {enrolled && <button className="btn btn-danger btn-sm" onClick={remove}>{t('Borrar plantilla')}</button>}
        </div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          <div className="camera-frame face-cam" style={{ '--frame': 'var(--purple)' } as CSSProperties}>
            <video ref={cam.videoRef} playsInline muted aria-label={t('Cámara para registrar tu rostro')} />
            {cam.state !== 'on' && <div className="camera-overlay"><p className="small muted mb0">{t('La cámara se abrirá al capturar.')}</p></div>}
          </div>
          <p className="small muted center mb0" aria-live="polite">{hint}</p>
          <label className="row small" style={{ alignItems: 'flex-start', gap: 8, flexWrap: 'nowrap' }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 4 }} />
            <span>{t('Acepto que MoodWave guarde una')} <strong>{t('plantilla numérica')}</strong> {t('de mi rostro (128 números, nunca una imagen) solo para iniciar sesión. Puedo borrarla cuando quiera.')}</span>
          </label>
          <ErrorBox error={error || cam.error} />
          <div className="row">
            <button className="btn btn-primary btn-sm" disabled={!consent || busy} onClick={capture}>{busy ? t('Capturando…') : t('Capturar rostro')}</button>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { cam.stop(); setOpen(false); setError(null); }}>{t('Cancelar')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
