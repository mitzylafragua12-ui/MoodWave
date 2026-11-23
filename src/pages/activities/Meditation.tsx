import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ActivityProps } from '../ActivityRunner';
import { fmtDuration } from '../../lib/date';

// Patrón 4-4-6: inhalar 4 s, sostener 4 s, exhalar 6 s.
const PHASES = [
  { name: 'Inhala', sec: 4, scale: 1.25 },
  { name: 'Sostén', sec: 4, scale: 1.25 },
  { name: 'Exhala', sec: 6, scale: 0.8 },
] as const;
const CYCLE = PHASES.reduce((s, p) => s + p.sec, 0);
const OPTIONS = [1, 3, 5];
const MIN_SEC = 60;

export default function Meditation({ onComplete, busy, autoStart }: ActivityProps) {
  const [minutes, setMinutes] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(autoStart);
  const [started, setStarted] = useState(autoStart);
  const last = useRef(0);
  const total = minutes * 60;
  const done = elapsed >= total;

  useEffect(() => {
    if (!running) return;
    last.current = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = (now - last.current) / 1000;
      last.current = now;
      setElapsed((e) => Math.min(total, e + dt));
    }, 200);
    return () => clearInterval(id);
  }, [running, total]);

  useEffect(() => { if (done) setRunning(false); }, [done]);

  const inCycle = elapsed % CYCLE;
  let acc = 0;
  let phase: (typeof PHASES)[number] = PHASES[0];
  let phaseLeft = 0;
  for (const p of PHASES) {
    if (inCycle < acc + p.sec) { phase = p; phaseLeft = Math.ceil(acc + p.sec - inCycle); break; }
    acc += p.sec;
  }
  const r = 46;
  const circ = 2 * Math.PI * r;

  return (
    <div className="card" style={{ maxWidth: 560, margin: '0 auto' }}>
      {!started ? (
        <div className="center stack" style={{ alignItems: 'center' }}>
          <p className="muted">Siéntate cómodo, relaja los hombros y sigue el círculo: <strong>inhala 4 s · sostén 4 s · exhala 6 s</strong>.</p>
          <div className="row" role="radiogroup" aria-label="Duración">
            {OPTIONS.map((m) => (
              <button key={m} role="radio" aria-checked={minutes === m} className={`btn btn-sm ${minutes === m ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMinutes(m)}>{m} min</button>
            ))}
          </div>
          <button className="btn btn-cyan" onClick={() => { setStarted(true); setRunning(true); }}>Comenzar</button>
        </div>
      ) : (
        <>
          <div className="breath-wrap">
            <div className="breath-ring">
              <svg viewBox="0 0 100 100" aria-hidden>
                <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-2)" strokeWidth="5" />
                <circle cx="50" cy="50" r={r} fill="none" stroke="var(--purple)" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={circ * (1 - elapsed / total)} style={{ transition: 'stroke-dashoffset .2s linear' }} />
              </svg>
              <div className="breath-core" style={{ transform: `scale(${running ? phase.scale : 1})`, '--dur': `${phase.sec}s` } as CSSProperties}>
                <div className="center">
                  <div className="breath-time" aria-live="off">{fmtDuration(Math.max(0, total - elapsed))}</div>
                  <div className="small muted">restante</div>
                </div>
              </div>
            </div>
            <div className="phase mt" aria-live="polite">{done ? 'Terminado' : running ? `${phase.name} · ${phaseLeft}` : 'En pausa'}</div>
            <div className="small faint">Inhala · Sostén · Exhala</div>
            {!done && (
              <div className="row mt" role="radiogroup" aria-label="Duración" style={{ justifyContent: 'center' }}>
                <span className="small faint">Duración:</span>
                {OPTIONS.filter((m) => m * 60 > elapsed).map((m) => (
                  <button key={m} role="radio" aria-checked={minutes === m} className={`btn btn-sm ${minutes === m ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMinutes(m)}>{m} min</button>
                ))}
              </div>
            )}
          </div>
          <div className="row" style={{ justifyContent: 'center' }}>
            {!done && <button className="btn btn-ghost" onClick={() => setRunning((r) => !r)}>{running ? 'Pausar' : 'Reanudar'}</button>}
            <button className="btn btn-primary" disabled={busy || elapsed < MIN_SEC}
              onClick={() => { setRunning(false); onComplete({ durationSeconds: elapsed }); }}>
              {done ? 'Completar' : elapsed < MIN_SEC ? `Completar (en ${Math.ceil(MIN_SEC - elapsed)} s)` : 'Terminar y completar'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
