import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ActivityProps } from '../ActivityRunner';

const ROUND_SEC = 45;
const WORRIES = ['estrés', 'prisa', 'miedo', 'enojo', 'dudas', 'presión', 'ruido', 'culpa', 'tareas', 'cansancio', 'nervios', 'caos'];
const AFFIRMATIONS = ['Eres suficiente', 'Respira, vas bien', 'Un paso a la vez', 'Mereces descansar', 'Tú puedes', 'Esto también pasará'];
const COLORS = ['#22d3ee', '#a78bfa', '#38bdf8', '#f472b6', '#4ade80'];

interface Bubble { id: number; x: number; size: number; t: number; sway: number; text: string; color: string; gold: boolean; popped: boolean }

export default function Minigame({ onComplete, busy }: ActivityProps) {
  const [state, setState] = useState<'ready' | 'playing' | 'over'>('ready');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(ROUND_SEC);
  const [affirm, setAffirm] = useState<{ id: number; text: string } | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    if (state !== 'playing') return;
    const end = Date.now() + ROUND_SEC * 1000;
    const timer = setInterval(() => {
      const l = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) { setState('over'); setBubbles([]); }
    }, 250);
    const spawn = setInterval(() => {
      const gold = Math.random() < 0.12;
      const size = gold ? 74 : 62 + Math.random() * 30;
      setBubbles((bs) => [...bs.slice(-24), {
        id: nextId.current++, x: Math.random() * 86, size, t: 5 + Math.random() * 3.5,
        sway: (Math.random() - 0.5) * 60, gold, popped: false,
        text: gold ? '✨' : WORRIES[Math.floor(Math.random() * WORRIES.length)],
        color: gold ? '#eab308' : COLORS[Math.floor(Math.random() * COLORS.length)],
      }]);
    }, 650);
    return () => { clearInterval(timer); clearInterval(spawn); };
  }, [state]);

  const pop = useCallback((b: Bubble) => {
    if (b.popped) return;
    setBubbles((bs) => bs.map((x) => (x.id === b.id ? { ...x, popped: true } : x)));
    setScore((s) => s + (b.gold ? 5 : 1));
    if (b.gold) setAffirm({ id: b.id, text: AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)] });
    setTimeout(() => setBubbles((bs) => bs.filter((x) => x.id !== b.id)), 230);
  }, []);

  const h = area.current?.clientHeight ?? 460;

  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <div className="game-area" ref={area}>
        <div className="game-hud">
          <span className="chip">🫧 {score} puntos</span>
          <span className="chip">⏱ {left}s</span>
        </div>
        {state === 'playing' && bubbles.map((b) => (
          <button key={b.id} className={`bubble-go${b.popped ? ' popped' : ''}`}
            aria-label={`Reventar burbuja ${b.text}`}
            style={{ left: `${b.x}%`, width: b.size, height: b.size, '--t': `${b.t}s`, '--h': `${h}px`, '--sway': `${b.sway}px`, '--c': b.color } as CSSProperties}
            onPointerDown={() => pop(b)}
            onAnimationEnd={(e) => { if (e.animationName === 'rise') setBubbles((bs) => bs.filter((x) => x.id !== b.id)); }}>
            {b.text}
          </button>
        ))}
        {affirm && <div key={affirm.id} className="affirmation" onAnimationEnd={() => setAffirm(null)}>{affirm.text}</div>}
        {state !== 'playing' && (
          <div className="camera-overlay">
            {state === 'ready' ? (
              <div className="stack" style={{ alignItems: 'center' }}>
                <h2>Burbujas de calma</h2>
                <p className="muted" style={{ maxWidth: 380 }}>Revienta las burbujas para soltar lo que te pesa. Las doradas ✨ valen 5 puntos y traen un mensaje para ti. Tienes {ROUND_SEC} segundos.</p>
                <button className="btn btn-cyan" onClick={() => { setScore(0); setLeft(ROUND_SEC); setState('playing'); }}>Jugar</button>
              </div>
            ) : (
              <div className="stack" style={{ alignItems: 'center' }}>
                <h2>¡Tiempo!</h2>
                <div className="xp-burst">{score}</div>
                <p className="muted">burbujas de tensión liberadas</p>
                <div className="row">
                  <button className="btn btn-ghost" onClick={() => { setScore(0); setLeft(ROUND_SEC); setState('playing'); }}>Otra vez</button>
                  <button className="btn btn-primary" disabled={busy} onClick={() => onComplete({ durationSeconds: ROUND_SEC, score })}>Completar actividad</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
