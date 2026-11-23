import { useMemo, useState } from 'react';
import type { GameProps } from './types';

// NEUTRAL: encontrar el color distinto activa la atención sin estresar.
export default function OddOne({ addScore, say }: GameProps) {
  const [level, setLevel] = useState(0);
  const [shake, setShake] = useState(false);
  const board = useMemo(() => {
    const size = Math.min(2 + Math.floor(level / 2), 6);
    const hue = Math.floor(Math.random() * 360);
    const delta = Math.max(5, 24 - level * 1.6);
    return { size, odd: Math.floor(Math.random() * size * size), base: `hsl(${hue} 70% 55%)`, diff: `hsl(${hue} 70% ${55 + delta}%)` };
  }, [level]);

  function tap(i: number) {
    if (i === board.odd) {
      addScore(1);
      if ((level + 1) % 6 === 0) say('¡Qué buena vista!');
      setLevel((l) => l + 1);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 300);
    }
  }

  return (
    <div className="game-layer center-grid">
      <div className={`odd-grid${shake ? ' shake' : ''}`} style={{ gridTemplateColumns: `repeat(${board.size}, 1fr)` }}>
        {Array.from({ length: board.size * board.size }, (_, i) => (
          <button key={`${level}-${i}`} aria-label={`Cuadro ${i + 1}`} onClick={() => tap(i)}
            style={{ background: i === board.odd ? board.diff : board.base }} />
        ))}
      </div>
      <p className="game-tip" style={{ top: 'auto', bottom: 8 }}>Nivel {level + 1} · toca el cuadro de color distinto</p>
    </div>
  );
}
