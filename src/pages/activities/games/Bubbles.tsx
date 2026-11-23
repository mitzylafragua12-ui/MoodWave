import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { pick, type GameProps } from './types';

// ENOJO: reventar burbujas con lo que molesta libera tensión de forma segura.
const WORRIES = ['estrés', 'prisa', 'enojo', 'presión', 'ruido', 'culpa', 'tareas', 'injusto', 'gritos', 'tráfico', 'nervios', 'caos'];
const CALM = ['Respira, vas bien', 'Suelta lo que pesa', 'Tú tienes el control', 'Esto también pasará', 'Un paso a la vez'];
const COLORS = ['#f43f5e', '#fb923c', '#f472b6', '#a78bfa', '#22d3ee'];

interface Bubble { id: number; x: number; size: number; t: number; sway: number; text: string; color: string; gold: boolean; popped: boolean }

export default function Bubbles({ addScore, say }: GameProps) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const area = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    const spawn = setInterval(() => {
      const gold = Math.random() < 0.12;
      setBubbles((bs) => [...bs.slice(-24), {
        id: nextId.current++, x: Math.random() * 86, size: gold ? 74 : 62 + Math.random() * 30, t: 5 + Math.random() * 3.5,
        sway: (Math.random() - 0.5) * 60, gold, popped: false,
        text: gold ? '✨' : pick(WORRIES), color: gold ? '#eab308' : pick(COLORS),
      }]);
    }, 620);
    return () => clearInterval(spawn);
  }, []);

  const pop = useCallback((b: Bubble) => {
    if (b.popped) return;
    setBubbles((bs) => bs.map((x) => (x.id === b.id ? { ...x, popped: true } : x)));
    addScore(b.gold ? 5 : 1);
    if (b.gold) say(pick(CALM));
    setTimeout(() => setBubbles((bs) => bs.filter((x) => x.id !== b.id)), 230);
  }, [addScore, say]);

  const h = area.current?.clientHeight ?? 460;
  return (
    <div ref={area} style={{ position: 'absolute', inset: 0 }}>
      {bubbles.map((b) => (
        <button key={b.id} className={`bubble-go${b.popped ? ' popped' : ''}`} aria-label={`Reventar burbuja ${b.text}`}
          style={{ left: `${b.x}%`, width: b.size, height: b.size, '--t': `${b.t}s`, '--h': `${h}px`, '--sway': `${b.sway}px`, '--c': b.color } as CSSProperties}
          onPointerDown={() => pop(b)}
          onAnimationEnd={(e) => { if (e.animationName === 'rise') setBubbles((bs) => bs.filter((x) => x.id !== b.id)); }}>
          {b.text}
        </button>
      ))}
    </div>
  );
}
