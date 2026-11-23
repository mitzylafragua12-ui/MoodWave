import { useState } from 'react';
import { pick, shuffle, useTimers, type GameProps } from './types';
import { t, tm } from '../../../i18n';

// MIEDO: buscar con calma objetos concretos regresa la atención al aquí y ahora (anclaje).
const CALM = ['🌿', '🐚', '🌙', '☁️', '🌊', '🍃', '🕯️', '🌼', '🐢', '🪶', '🍵', '🌸', '🦋', '🪴', '🌻', '🐌', '🍂', '⭐'];
const GROUND = [tm('Estás aquí y estás a salvo'), tm('Siente tus pies en el suelo'), tm('Nota cómo entra y sale el aire'), tm('Mira tres cosas a tu alrededor')];

function board(cells: number) {
  const target = pick(CALM);
  const others = CALM.filter((e) => e !== target);
  const grid = Array.from({ length: cells - 1 }, () => pick(others));
  grid.splice(Math.floor(Math.random() * cells), 0, target);
  return { target, grid: shuffle(grid) };
}

export default function Seek({ addScore, say }: GameProps) {
  const [found, setFound] = useState(0);
  const cols = found < 5 ? 4 : 5;
  const [b, setB] = useState(() => board(16));
  const [wrong, setWrong] = useState<number | null>(null);
  const later = useTimers();

  function tap(i: number) {
    if (b.grid[i] === b.target) {
      addScore(1);
      const f = found + 1;
      setFound(f);
      if (f % 4 === 0) say(t(pick(GROUND)));
      setB(board(f < 5 ? 16 : 25));
    } else { setWrong(i); later(() => setWrong(null), 300); }
  }

  return (
    <div className="game-col">
      <span className="chip" style={{ fontSize: '1rem' }}>{t('Encuentra:')} <span style={{ fontSize: '1.6rem' }}>{b.target}</span></span>
      <div className="tile-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, width: `min(${cols * 66}px, 100%)`, gap: 6 }}>
        {b.grid.map((e, i) => (
          <button key={`${found}-${i}`} className={`tile${wrong === i ? ' shake' : ''}`} style={{ fontSize: '1.6rem' }} onClick={() => tap(i)} aria-label={e}>{e}</button>
        ))}
      </div>
    </div>
  );
}
