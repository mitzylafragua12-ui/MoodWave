import { useState } from 'react';
import { useTimers, type GameProps } from './types';
import { t } from '../../../i18n';

// MIEDO: unir estrellas en orden es una tarea predecible y tranquila que ordena la mente.
interface P { x: number; y: number }
function stars(n: number): P[] {
  const out: P[] = [];
  for (let tries = 0; out.length < n && tries < 2000; tries++) {
    const p = { x: 10 + Math.random() * 80, y: 20 + Math.random() * 68 };
    if (out.every((q) => Math.hypot(q.x - p.x, (q.y - p.y) * 0.8) > 15)) out.push(p);
  }
  return out;
}

export default function Constellation({ addScore, say }: GameProps) {
  const [n, setN] = useState(5);
  const [pts, setPts] = useState(() => stars(5));
  const [next, setNext] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const later = useTimers();

  function tap(i: number) {
    if (next >= pts.length) return;
    if (i !== next) { setWrong(i); later(() => setWrong(null), 300); return; }
    addScore(1);
    setNext(next + 1);
    if (next + 1 === pts.length) {
      addScore(2); say(t('¡Constelación completa!'));
      later(() => { const m = Math.min(10, n + 1); setN(m); setPts(stars(m)); setNext(0); }, 1000);
    }
  }

  return (
    <div className="game-layer night">
      <svg className="lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {pts.slice(1, next).map((p, i) => (
          <line key={i} x1={pts[i].x} y1={pts[i].y} x2={p.x} y2={p.y} stroke="#fde047" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {pts.map((p, i) => (
        <button key={`${n}-${i}`} className={`star-btn${i < next ? ' done' : ''}${wrong === i ? ' shake' : ''}`}
          style={{ left: `${p.x}%`, top: `${p.y}%` }} onClick={() => tap(i)} aria-label={t('Estrella {n}', { n: i + 1 })}>{i + 1}</button>
      ))}
      <p className="game-tip">{t('Toca las estrellas en orden: 1, 2, 3…')}</p>
    </div>
  );
}
