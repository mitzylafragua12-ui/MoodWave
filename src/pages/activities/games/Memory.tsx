import { useEffect, useState } from 'react';
import type { GameProps } from './types';

// SORPRESA: encontrar parejas convierte la sorpresa en atención y orden.
const EMOJIS = ['🎁', '🎈', '🎉', '🌟', '🍀', '🦋'];
interface Card { id: number; e: string; open: boolean; done: boolean }

const deck = (): Card[] =>
  [...EMOJIS, ...EMOJIS].map((e, i) => ({ id: i, e, open: false, done: false })).sort(() => Math.random() - 0.5);

export default function Memory({ addScore, say }: GameProps) {
  const [cards, setCards] = useState(deck);
  const [lock, setLock] = useState(false);

  useEffect(() => {
    if (cards.every((c) => c.done)) {
      say('¡Tablero completo! Otro más…');
      const t = setTimeout(() => setCards(deck()), 900);
      return () => clearTimeout(t);
    }
  }, [cards, say]);

  function flip(card: Card) {
    if (lock || card.open || card.done) return;
    const open = cards.filter((c) => c.open && !c.done);
    const next = cards.map((c) => (c.id === card.id ? { ...c, open: true } : c));
    setCards(next);
    if (open.length === 1) {
      const [a] = open;
      if (a.e === card.e) {
        addScore(1);
        setCards(next.map((c) => (c.e === card.e ? { ...c, done: true } : c)));
      } else {
        setLock(true);
        setTimeout(() => { setCards((cs) => cs.map((c) => (c.done ? c : { ...c, open: false }))); setLock(false); }, 700);
      }
    }
  }

  return (
    <div className="game-layer center-grid">
      <div className="memory-grid">
        {cards.map((c) => (
          <button key={c.id} className={`memory-card${c.open || c.done ? ' open' : ''}${c.done ? ' done' : ''}`}
            onClick={() => flip(c)} aria-label={c.open || c.done ? c.e : 'Carta oculta'}>
            <span>{c.open || c.done ? c.e : '?'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
