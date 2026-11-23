import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useProfile } from '../context/AuthContext';
import { errMsg, useToast } from '../context/ToastContext';
import { EMOTIONS, EMOTION_BY_KEY } from '../lib/catalog';
import { dominant, detectExpressions, ExpressionSmoother, loadFaceApi, type Scores, EMOTION_KEYS } from '../lib/faceDetection';
import type { EmotionKey } from '../lib/types';
import { ErrorBox, PageHead, ProgressBar } from '../components/ui';

type Phase = 'idle' | 'loading' | 'running' | 'denied' | 'error';
const AUTO_SECONDS = 1;

export default function Detect() {
  const profile = useProfile();
  const nav = useNavigate();
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const smoother = useRef(new ExpressionSmoother(6));
  const [phase, setPhase] = useState<Phase>('idle');
  const [scores, setScores] = useState<Scores | null>(null);
  const [faceFound, setFaceFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [autoGo, setAutoGo] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const startedAt = useRef(0);

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
    smoother.current.clear();
    setScores(null);
    setElapsed(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Tu navegador no permite acceder a la cámara (se requiere HTTPS).');
      // El modelo se carga en paralelo (normalmente ya viene precargado desde el inicio):
      // la cámara se muestra de inmediato y la primera lectura llega en cuanto el modelo esté listo.
      const model = loadFaceApi();
      model.catch((e) => { setError('No se pudo cargar el modelo de IA: ' + errMsg(e)); setShowManual(true); });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (!mounted.current) { stream.getTracks().forEach((t) => t.stop()); return; } // ya salió de la página
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      startedAt.current = performance.now();
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

  // Bucle de detección (~6 lecturas por segundo).
  useEffect(() => {
    if (phase !== 'running') return;
    let alive = true;
    let timer: number;
    const elapsedRef = { current: null as number | null };
    const tick = async () => {
      const v = videoRef.current;
      if (!alive || !v || v.readyState < 2) { timer = window.setTimeout(tick, 50); return; }
      try {
        const s = await detectExpressions(v);
        if (!alive) return;
        setFaceFound(!!s);
        if (s) {
          smoother.current.push(s);
          setScores(smoother.current.average());
          if (smoother.current.stable && elapsedRef.current === null) {
            const t = (performance.now() - startedAt.current) / 1000;
            elapsedRef.current = t;
            setElapsed(t);
          }
        }
      } catch { /* fotograma omitido */ }
      timer = window.setTimeout(tick, 0); // lecturas seguidas, sin pausas artificiales
    };
    tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [phase]);

  const result = scores ? dominant(scores) : null;
  const stable = smoother.current.stable && faceFound;
  const ready = phase === 'running' && !!result && smoother.current.stable;
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
      if (r.xp_granted > 0) toast(`+${r.xp_granted} XP por tu check-in del día`);
      r.new_badges.forEach((b) => toast(`${b.icon} Logro desbloqueado: ${b.name}`));
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
      <PageHead eyebrow="Detección emocional" title="¿Cómo te sientes?" color="var(--red)"
        subtitle="Mira a la cámara con naturalidad. El análisis se hace 100% en tu dispositivo: no se guardan ni envían imágenes." />

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="stack">
          <div className="camera-frame" style={{ '--frame': frameColor } as CSSProperties}>
            <video ref={videoRef} playsInline muted aria-label="Vista previa de la cámara" />
            {phase !== 'running' && (
              <div className="camera-overlay">
                <div className="stack" style={{ alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: '3.2rem' }} aria-hidden>🙂</div>
                  {phase === 'loading' ? <p className="muted">Cargando modelo de IA y cámara…</p>
                    : phase === 'denied' ? <p className="muted">No diste permiso para usar la cámara. Puedes habilitarlo en tu navegador o elegir tu emoción manualmente.</p>
                    : <p className="muted">Activa la cámara para detectar tu estado de ánimo.</p>}
                  {phase !== 'loading' && <button className="btn btn-primary" onClick={start} disabled={profile.suspended}>Activar cámara</button>}
                </div>
              </div>
            )}
            {phase === 'running' && (
              <div className="camera-status chip">
                <span className="live-dot" />{faceFound ? (stable ? 'Rostro detectado' : 'Analizando…') : 'Buscando rostro…'}
              </div>
            )}
          </div>
          <ErrorBox error={error} />
          {phase === 'running' && <button className="btn btn-ghost btn-sm" onClick={() => { stop(); setPhase('idle'); setScores(null); }}>Detener cámara</button>}
        </div>

        <div className="stack">
          <div className="card">
            <div className="eyebrow">Emoción detectada</div>
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
                {elapsed !== null && <p className="small faint">Lectura estable en {elapsed.toFixed(1)} s</p>}
                {countdown !== null && !saving ? (
                  <div className="notice mt spread" aria-live="polite">
                    <span>Te llevo a tu actividad en <strong>{countdown}</strong>…</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setAutoGo(false)}>Cancelar</button>
                  </div>
                ) : (
                  <button className="btn btn-primary btn-block mt" disabled={!stable || saving || profile.suspended}
                    onClick={() => confirm(result.emotion, result.confidence, scores!, 'camera')}>
                    {saving ? 'Abriendo tu actividad…' : 'Ir a mi actividad'}
                  </button>
                )}
              </>
            ) : (
              <p className="muted">{phase === 'running' ? 'Detectando tu estado de ánimo…' : 'Aquí verás tu emoción y el nivel de confianza.'}</p>
            )}
          </div>

          <div className="card">
            <button className="spread icon-btn" style={{ width: '100%', fontSize: '1rem', padding: 0 }} onClick={() => setShowManual((s) => !s)} aria-expanded={showManual}>
              <span>¿Sin cámara? Elige tu emoción</span><span className="faint">{showManual ? '▲' : '▼'}</span>
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
