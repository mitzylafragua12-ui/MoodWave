import { useState } from 'react';
import { shuffle, useTimers, type GameProps } from './types';
import { t } from '../../../i18n';

// NEUTRAL: buscar los números en orden (tabla de Schulte) entrena la atención y la vista periférica.
const board = (size: number) => shuffle(Array.from({ length: size * size }, (_, i) => i + 1));

export default function Schulte({ addScore, say }: GameProps) {
  const [boards, setBoards] = useState(0);
  const size = boards < 2 ? 4 : 5;
  const [nums, setNums] = useState(() => board(4));
  const [next, setNext] = useState(1);
  const [wrong, setWrong] = useState<number | null>(null);
  const later = useTimers();

  function tap(v: number) {
    if (v < next) return;
    if (v !== next) { setWrong(v); later(() => setWrong(null), 300); return; }
    addScore(1);
    if (v === size * size) {
      addScore(3); say(t('¡Tablero completo! Otro más…'));
      const b = boards + 1;
      later(() => { setBoards(b); setNums(board(b < 2 ? 4 : 5)); setNext(1); }, 700);
    }
    setNext(v + 1);
  }

  return (
    <div className="game-col">
      <span className="chip">{t('Busca el')} <strong style={{ fontSize: '1.1rem' }}>{Math.min(next, size * size)}</strong></span>
      <div className="tile-grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: `min(${size * 64}px, 100%)`, gap: 6 }}>
        {nums.map((v) => (
          <button key={`${boards}-${v}`} className={`tile num${v < next ? ' ok' : ''}${wrong === v ? ' shake' : ''}`} onClick={() => tap(v)}>{v}</button>
        ))}
      </div>
      <p className="small muted mb0">{t('Toca los números del 1 al {n} en orden.', { n: size * size })}</p>
    </div>
  );
}
