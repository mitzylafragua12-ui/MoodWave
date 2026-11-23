import { useEffect, useState } from 'react';
import { pick, useTimers, type GameProps } from './types';
import { t, tm } from '../../../i18n';

// SORPRESA: seguir la bolita entre vasos que se mueven convierte la sorpresa en atención sostenida.
const CHEERS = [tm('¡Buen ojo!'), tm('¡Nada se te escapa!'), tm('¡Exacto!')];
type Phase = 'show' | 'shuffle' | 'guess' | 'reveal';

export default function Cups({ addScore, say }: GameProps) {
  const [slots, setSlots] = useState([0, 1, 2]); // slots[vaso] = posición
  const [ball, setBall] = useState(() => Math.floor(Math.random() * 3));
  const [phase, setPhase] = useState<Phase>('show');
  const [level, setLevel] = useState(0);
  const [round, setRound] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const later = useTimers();

  useEffect(() => {
    const swaps = 3 + level;
    const speed = Math.max(240, 430 - level * 25);
    later(() => setPhase('shuffle'), 1100);
    for (let k = 0; k < swaps; k++) {
      later(() => setSlots((s) => {
        const a = Math.floor(Math.random() * 3);
        const b = (a + 1 + Math.floor(Math.random() * 2)) % 3;
        const out = [...s];
        const ia = out.indexOf(a), ib = out.indexOf(b);
        out[ia] = b; out[ib] = a;
        return out;
      }), 1300 + k * speed);
    }
    later(() => setPhase('guess'), 1300 + swaps * speed + 200);
  }, [round, level, later]);

  function guess(cup: number) {
    if (phase !== 'guess') return;
    setChosen(cup); setPhase('reveal');
    if (cup === ball) { addScore(1 + Math.floor(level / 2)); say(t(pick(CHEERS))); }
    else say(t('¡Estaba aquí!'));
    later(() => {
      if (cup === ball) setLevel((l) => l + 1);
      setBall(Math.floor(Math.random() * 3)); setChosen(null); setPhase('show'); setRound((r) => r + 1);
    }, 1300);
  }

  const up = (cup: number) => phase === 'show' || (phase === 'reveal' && (cup === ball || cup === chosen));
  const left = (slot: number) => `${22 + slot * 28}%`;
  return (
    <div className="game-layer">
      {phase !== 'shuffle' && <span className="ball" style={{ left: left(slots[ball]) }} aria-hidden>🟡</span>}
      {[0, 1, 2].map((c) => (
        <button key={c} className={`cup${up(c) ? ' up' : ''}`} style={{ left: left(slots[c]) }} onClick={() => guess(c)}
          aria-label={t('Vaso {n}', { n: slots[c] + 1 })} disabled={phase !== 'guess'} />
      ))}
      <p className="game-tip">{phase === 'guess' ? t('¿Dónde está la bolita?') : phase === 'show' ? t('Mira dónde está la bolita…') : phase === 'shuffle' ? t('No le quites el ojo…') : ''}</p>
    </div>
  );
}
