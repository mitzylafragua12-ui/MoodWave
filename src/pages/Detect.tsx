import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useProfile } from '../context/AuthContext';
import { errMsg, useToast } from '../context/ToastContext';
import { EMOTIONS, EMOTION_BY_KEY } from '../lib/catalog';
import { dominant, detectExpressions, ExpressionWindow, loadFaceApi, MIN_ANALYSIS_SECONDS, type Scores, EMOTION_KEYS } from '../lib/faceDetection';
import type { EmotionKey } from '../lib/types';
import { ErrorBox, PageHead, ProgressBar } from '../components/ui';
import { t } from '../i18n';
import { badgeName } from '../lib/catalog';

type Phase = 'idle' | 'loading' | 'running' | 'denied' | 'error';
const AUTO_SECONDS = 1;

export default function Detect() {
  const profile = useProfile();
  const nav = useNavigate();
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysis = useRef(new ExpressionWindow());
  const [phase, setPhase] = useState<Phase>('idle');
  const [scores, setScores] = useState<Scores | null>(null);
  const [faceFound, setFaceFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [autoGo, setAutoGo] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<{ secs: number; n: number } | null>(null);
  const [progress, setProgress] = useState(0);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  // La cámara se abre sola al entrar a la página (no hace falta pulsar «Activar cámara»).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    if (!profile.suspended) start();
    return () => { mounted.current = false; stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const starting = useRef(false);
  async function start() {
    if (starting.current || streamRef.current) return;
    starting.current = true;
    setError(null);
    setPhase('loading');
    analysis.current.clear();
    setScores(null);
    setElapsed(null);
    setProgress(0);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error(t('Tu navegador no permite acceder a la cámara (se requiere HTTPS).'));
      // El modelo se carga en paralelo (normalmente ya viene precargado desde el inicio):
      // la cámara se muestra de inmediato y la primera lectura llega en cuanto el modelo esté listo.
      const model = loadFaceApi();
      model.catch((e) => { setError(t('No se pudo cargar el modelo de IA: {error}', { error: errMsg(e) })); setShowManual(true); });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (!mounted.current) { stream.getTracks().forEach((t) => t.stop()); return; } // ya salió de la página
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      setPhase('running');
    } catch (e) {
      stop();
      const name = (e as { name?: string }).name;
      if (name === 'NotAllowedError' || name === 'SecurityError') { setPhase('denied'); setShowManual(true); }
      else { setPhase('error'); setError(errMsg(e)); setShowManual(true); }
    } finally {
      starting.current = false;
    }
  }

  // Bucle de detección: lee sin pausas y acumula al menos 6 s con la cara a cuadro.
  useEffect(() => {
    if (phase !== 'running') return;
    let alive = true;
    let timer: number;
    let completed = false;
    const tick = async () => {
      const v = videoRef.current;
      if (!alive || !v || v.readyState < 2) { timer = window.setTimeout(tick, 50); return; }
      try {
        const s = await detectExpressions(v);
        if (!alive) return;
        setFaceFound(!!s);
        const w = analysis.current;
        w.push(s, performance.now());
        if (s) {
          setScores(w.average());
          setProgress(w.progress);
          if (w.complete && !completed) {
            completed = true;
            setElapsed({ secs: w.seconds, n: w.count });
          }
        }
      } catch { /* fotograma omitido */ }
      timer = window.setTimeout(tick, 0); // lecturas seguidas, sin pausas artificiales
    };
    tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [phase]);

  const result = scores ? dominant(scores) : null;
  const done = elapsed !== null;
  const stable = done && faceFound;
  const ready = phase === 'running' && !!result && done;
  const latest = useRef<{ emotion: EmotionKey; confidence: number; scores: Scores } | null>(null);
  latest.current = result && scores ? { ...result, scores } : null;
  const firing = useRef(false);

  // En cuanto la lectura es estable, lleva a la actividad automáticamente tras una breve cuenta.
  useEffect(() => {
    if (!autoGo || !ready || saving) { setCountdown(null); return; }
    setCountdown(AUTO_SECONDS);
    const id = setInterval(() => setCountdown((c) => (c === null ? null : Math.max(0, c - 1))), 1000);
    return () => clearInterval(id);
  }, [autoGo, ready, saving]);
  useEffect(() => {
    if (countdown === 0 && latest.current) {
      const l = latest.current;
      confirm(l.emotion, l.confidence, l.scores, 'camera');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  async function confirm(emotion: EmotionKey, confidence: number, s: Record<string, number>, source: 'camera' | 'manual') {
    if (firing.current) return;
    firing.current = true;
    setSaving(true);
    try {
      const r = await api.recordDetection(emotion, confidence, s, source);
      stop();
      if (r.xp_granted > 0) toast(t('+{xp} XP por tu check-in del día', { xp: r.xp_granted }));
      r.new_badges.forEach((b) => toast(`${b.icon} ${t('Logro desbloqueado: {name}', { name: badgeName(b) })}`));
      // Directo a la actividad recomendada; arranca sola (?auto=1). Desde ahí se puede cambiar.
      nav(`/actividad/${r.assignment_id}?auto=1`);
    } catch (e) {
      toast(errMsg(e), 'error');
      setAutoGo(false);
      firing.current = false;
    } finally { setSaving(false); }
  }

  const frameColor = result ? EMOTION_BY_KEY[result.emotion].color : 'var(--purple)';

  return (
    <div className="page">
      <PageHead eyebrow={t('Detección emocional')} title={t('¿Cómo te sientes?')} color="var(--red)"
        subtitle={t('Mira a la cámara con naturalidad. El análisis se hace 100% en tu dispositivo: no se guardan ni envían imágenes.')} />

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="stack">
          <div className="camera-frame" style={{ '--frame': frameColor } as CSSProperties}>
            <video ref={videoRef} playsInline muted aria-label={t('Vista previa de la cámara')} />
            {phase !== 'running' && (
              <div className="camera-overlay">
                <div className="stack" style={{ alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: '3.2rem' }} aria-hidden>🙂</div>
                  {phase === 'loading' ? <p className="muted">{t('Cargando modelo de IA y cámara…')}</p>
                    : phase === 'denied' ? <p className="muted">{t('No diste permiso para usar la cámara. Puedes habilitarlo en tu navegador o elegir tu emoción manualmente.')}</p>
                    : <p className="muted">{t('Activa la cámara para detectar tu estado de ánimo.')}</p>}
                  {phase !== 'loading' && <button className="btn btn-primary" onClick={start} disabled={profile.suspended}>{t('Activar cámara')}</button>}
                </div>
              </div>
            )}
            {phase === 'running' && (
              <div className="camera-status chip">
                <span className="live-dot" />{faceFound ? (stable ? t('Rostro detectado') : t('Analizando…')) : t('Buscando rostro…')}
              </div>
            )}
          </div>
          <ErrorBox error={error} />
          {phase === 'running' && <button className="btn btn-ghost btn-sm" onClick={() => { stop(); setPhase('idle'); setScores(null); setElapsed(null); setProgress(0); analysis.current.clear(); }}>{t('Detener cámara')}</button>}
        </div>

        <div className="stack">
          <div className="card">
            <div className="eyebrow">{t('Emoción detectada')}</div>
            {result ? (
              <>
                <div className="spread">
                  <div className="emotion-big">{EMOTION_BY_KEY[result.emotion].emoji} {EMOTION_BY_KEY[result.emotion].label}</div>
                  <div className="emotion-big" style={{ color: EMOTION_BY_KEY[result.emotion].color, fontSize: '1.5rem' }}>{Math.round(result.confidence * 100)}%</div>
                </div>
                <div className="mt">
                  {EMOTION_KEYS.map((k) => (
                    <div key={k} className="score-row">
                      <span className="muted">{EMOTION_BY_KEY[k].label}</span>
                      <ProgressBar value={scores![k]} color={EMOTION_BY_KEY[k].color} label={EMOTION_BY_KEY[k].label} />
                      <span className="small faint">{Math.round(scores![k] * 100)}%</span>
                    </div>
                  ))}
                </div>
                {!done ? (
                  <div className="mt" aria-live="polite">
                    <ProgressBar value={progress} color="var(--cyan)" label={t('Progreso del análisis')} />
                    <p className="small muted mb0">{t('Sigue mirando a la cámara: analizo {s} s para no equivocarme ({done} de {total} s).', { s: MIN_ANALYSIS_SECONDS, done: Math.floor(progress * MIN_ANALYSIS_SECONDS), total: MIN_ANALYSIS_SECONDS })}</p>
                  </div>
                ) : (
                  <p className="small faint">{t('Análisis completo: {n} lecturas en {s} s', { n: elapsed!.n, s: elapsed!.secs.toFixed(1) })}</p>
                )}
                {!done ? null : countdown !== null && !saving ? (
                  <div className="notice mt spread" aria-live="polite">
                    <span>{t('Te llevo a tu actividad en')} <strong>{countdown}</strong>…</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setAutoGo(false)}>{t('Cancelar')}</button>
                  </div>
                ) : (
                  <button className="btn btn-primary btn-block mt" disabled={!stable || saving || profile.suspended}
                    onClick={() => confirm(result.emotion, result.confidence, scores!, 'camera')}>
                    {saving ? t('Abriendo tu actividad…') : t('Ir a mi actividad')}
                  </button>
                )}
              </>
            ) : (
              <p className="muted">{phase === 'running' ? t('Detectando tu estado de ánimo…') : t('Aquí verás tu emoción y el nivel de confianza.')}</p>
            )}
          </div>

          <div className="card">
            <button className="spread icon-btn" style={{ width: '100%', fontSize: '1rem', padding: 0 }} onClick={() => setShowManual((s) => !s)} aria-expanded={showManual}>
              <span>{t('¿Sin cámara? Elige tu emoción')}</span><span className="faint">{showManual ? '▲' : '▼'}</span>
            </button>
            {showManual && (
              <div className="manual-grid mt">
                {EMOTIONS.map((e) => (
                  <button key={e.key} disabled={saving || profile.suspended} onClick={() => confirm(e.key, 1, { [e.key]: 1 }, 'manual')}>
                    <span className="emo" aria-hidden>{e.emoji}</span><span className="small">{e.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
