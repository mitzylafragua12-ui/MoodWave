import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { tone, useTimers, type GameProps } from './types';
import { t } from '../../../i18n';

// FELIZ: repetir melodías que crecen mantiene la energía alta y entrena la memoria.
const PADS = [{ c: '#f43f5e', f: 330 }, { c: '#22d3ee', f: 392 }, { c: '#facc15', f: 494 }, { c: '#4ade80', f: 587 }];
const rnd = () => Math.floor(Math.random() * PADS.length);

export default function Simon({ addScore, say }: GameProps) {
  const [seq, setSeq] = useState<number[]>(() => [rnd(), rnd()]);
  const [lit, setLit] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const pos = useRef(0);
  const later = useTimers();

  // Cada vez que cambia la melodía se reproduce y luego es el turno de la persona.
  useEffect(() => {
    pos.current = 0;
    seq.forEach((p, i) => {
      later(() => { setLit(p); tone(PADS[p].f, 320); }, 450 + i * 560);
      later(() => setLit(null), 450 + i * 560 + 360);
    });
    later(() => setListening(true), 450 + seq.length * 560);
  }, [seq, later]);

  function press(p: number) {
    if (!listening) return;
    setLit(p); tone(PADS[p].f, 220); later(() => setLit(null), 170);
    if (p !== seq[pos.current]) {
      setListening(false);
      say(t('Casi. Escucha una melodía nueva'));
      later(() => setSeq([rnd(), rnd()]), 700);
      return;
    }
    pos.current++;
    if (pos.current === seq.length) {
      setListening(false);
      addScore(seq.length);
      if (seq.length % 4 === 0) say(t('¡Gran memoria musical!'));
      later(() => setSeq((s) => [...s, rnd()]), 550);
    }
  }

  return (
    <div className="game-layer center-grid">
      <div className="simon">
        {PADS.map((p, i) => (
          <button key={i} className={`simon-pad${lit === i ? ' lit' : ''}`} style={{ '--c': p.c } as CSSProperties}
            onPointerDown={() => press(i)} aria-label={t('Nota {n}', { n: i + 1 })} />
        ))}
      </div>
      <p className="game-tip" style={{ top: 'auto', bottom: 8 }}>
        {listening ? t('Tu turno: repite la melodía ({n} notas)', { n: seq.length }) : t('Escucha y mira…')}
      </p>
    </div>
  );
}
