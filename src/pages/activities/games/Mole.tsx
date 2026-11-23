import { useEffect, useRef, useState } from 'react';
import { pick, useTimers, type GameProps } from './types';
import { t, tm } from '../../../i18n';

// FELIZ: atrapar sonrisas al vuelo canaliza la alegría en reflejos rápidos.
const SMILES = ['😊', '😄', '😁', '🥳', '😺', '🤩'];
const CHEERS = [tm('¡Qué buena racha!'), tm('¡Brillas hoy!'), tm('¡Sigue así!'), tm('¡Energía pura!')];
interface Pop { id: number; e: string; good: boolean }

export default function Mole({ addScore, say }: GameProps) {
  const [holes, setHoles] = useState<(Pop | null)[]>(() => Array(9).fill(null));
  const later = useTimers();
  const next = useRef(1);
  const hits = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      const i = Math.floor(Math.random() * 9);
      const p: Pop = Math.random() < 0.2 ? { id: next.current++, e: '🌧️', good: false } : { id: next.current++, e: pick(SMILES), good: true };
      setHoles((h) => (h[i] ? h : h.map((x, j) => (j === i ? p : x))));
      later(() => setHoles((h) => h.map((x) => (x?.id === p.id ? null : x))), 950);
    }, 460);
    return () => clearInterval(id);
  }, [later]);

  function tap(i: number) {
    const p = holes[i];
    if (!p) return;
    setHoles((h) => h.map((x, j) => (j === i ? null : x)));
    if (p.good) { addScore(1); if (++hits.current % 10 === 0) say(t(pick(CHEERS))); }
    else { addScore(-1); say(t('¡Esa era una nube!')); }
  }

  return (
    <div className="game-layer center-grid">
      <div className="tile-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', width: 'min(330px, 100%)' }}>
        {holes.map((p, i) => (
          <button key={i} className="tile hole" onPointerDown={() => tap(i)} aria-label={p ? p.e : t('Hoyo vacío')}>
            {p && <span key={p.id} className="pop-in">{p.e}</span>}
          </button>
        ))}
      </div>
      <p className="game-tip" style={{ top: 'auto', bottom: 8 }}>{t('Toca las sonrisas, evita las nubes 🌧️')}</p>
    </div>
  );
}
