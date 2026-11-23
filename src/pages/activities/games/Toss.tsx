import { useRef, useState, type PointerEvent } from 'react';
import { pick, type GameProps } from './types';
import { t, tm } from '../../../i18n';

// ENOJO: arrugar lo que molesta y tirarlo al cesto es una forma segura de soltarlo.
const WORRIES = [tm('estrés'), tm('prisa'), tm('enojo'), tm('presión'), tm('ruido'), tm('culpa'), tm('tareas'), tm('injusto'), tm('gritos'), tm('tráfico'), tm('nervios'), tm('caos')];
const START = { x: 0.5, y: 0.8 };

export default function Toss({ addScore, say }: GameProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [paper, setPaper] = useState(START);
  const [word, setWord] = useState(() => pick(WORRIES));
  const [bin, setBin] = useState(() => 0.2 + Math.random() * 0.6);
  const [dragging, setDragging] = useState(false);
  const count = useRef(0);

  const pos = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  function drop(e: PointerEvent) {
    if (!dragging) return;
    setDragging(false);
    const p = pos(e);
    const r = ref.current!.getBoundingClientRect();
    const dx = (p.x - bin) * r.width, dy = (p.y - 0.24) * r.height;
    if (Math.hypot(dx, dy) < 60) {
      addScore(1);
      if (++count.current % 4 === 0) say(t('¡Al cesto, {word}!', { word: t(word) }));
      setWord(pick(WORRIES)); setBin(0.15 + Math.random() * 0.7);
    }
    setPaper(START);
  }

  return (
    <div ref={ref} className="game-layer" onPointerMove={(e) => dragging && setPaper(pos(e))} onPointerUp={drop} onPointerCancel={drop}>
      <span className="sprite" style={{ left: `${bin * 100}%`, top: '24%', fontSize: '3.4rem' }} aria-label={t('Cesto')}>🗑️</span>
      <button className={`paper${dragging ? ' dragging' : ''}`} style={{ left: `${paper.x * 100}%`, top: `${paper.y * 100}%` }}
        onPointerDown={(e) => { (e.target as Element).releasePointerCapture?.(e.pointerId); setDragging(true); }}
        aria-label={t('Papel arrugado: {word}', { word: t(word) })}>
        <span aria-hidden>🗞️</span><small>{t(word)}</small>
      </button>
      <p className="game-tip">{t('Arrastra el papel con lo que te molesta hasta el cesto.')}</p>
    </div>
  );
}
