import { useEffect, useState } from 'react';
import { shuffle, useTimers, type GameProps } from './types';
import { t } from '../../../i18n';

// SORPRESA: detectar qué cambió transforma el sobresalto en observación.
const POOL = ['🍎', '🚗', '🐶', '⚽', '🎈', '🌵', '🍩', '🎸', '🐟', '🌙', '🍄', '🚀', '🧩', '🐝', '🍇', '⛄', '🎩', '📚'];
type Phase = 'look' | 'blink' | 'find' | 'reveal';

function makeBoard(cells: number) {
  const items = shuffle(POOL);
  const board = items.slice(0, cells);
  const changed = Math.floor(Math.random() * cells);
  const after = [...board];
  after[changed] = items[cells];
  return { board, after, changed };
}

export default function Changed({ addScore, say }: GameProps) {
  const [hits, setHits] = useState(0);
  const cells = hits < 4 ? 6 : hits < 8 ? 9 : 12;
  const [b, setB] = useState(() => makeBoard(6));
  const [phase, setPhase] = useState<Phase>('look');
  const later = useTimers();

  useEffect(() => {
    later(() => setPhase('blink'), 2600);
    later(() => setPhase('find'), 3200);
  }, [b, later]);

  function tap(i: number) {
    if (phase !== 'find') return;
    if (i === b.changed) {
      addScore(1); const h = hits + 1; setHits(h);
      if (h % 4 === 0) say(t('¡Qué buena vista!'));
      setPhase('look'); setB(makeBoard(h < 4 ? 6 : h < 8 ? 9 : 12));
    } else {
      setPhase('reveal'); say(t('Era este'));
      later(() => { setPhase('look'); setB(makeBoard(cells)); }, 1300);
    }
  }

  const shown = phase === 'look' ? b.board : b.after;
  return (
    <div className="game-col">
      <span className="chip">{phase === 'look' ? t('Memoriza el tablero…') : phase === 'blink' ? '👀' : t('¿Cuál cambió?')}</span>
      <div className="tile-grid" style={{ gridTemplateColumns: `repeat(${cells === 6 ? 3 : cells === 9 ? 3 : 4}, 1fr)`, width: `min(${cells === 12 ? 320 : 250}px, 100%)`, gap: 8 }}>
        {shown.map((e, i) => (
          <button key={i} className={`tile${phase === 'reveal' && i === b.changed ? ' sel' : ''}`} onClick={() => tap(i)} aria-label={phase === 'blink' ? t('Carta oculta') : e}>
            {phase === 'blink' ? '' : e}
          </button>
        ))}
      </div>
    </div>
  );
}
