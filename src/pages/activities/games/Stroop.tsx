import { useState } from 'react';
import { useTimers, type GameProps } from './types';
import { t, tm } from '../../../i18n';

// NEUTRAL: nombrar el color de la tinta y no la palabra (efecto Stroop) activa la concentración.
const INKS = [{ n: tm('ROJO'), c: '#ef4444' }, { n: tm('AZUL'), c: '#3b82f6' }, { n: tm('VERDE'), c: '#22c55e' }, { n: tm('AMARILLO'), c: '#eab308' }];

function round() {
  const w = Math.floor(Math.random() * INKS.length);
  const k = Math.random() < 0.75 ? (w + 1 + Math.floor(Math.random() * (INKS.length - 1))) % INKS.length : w;
  return { w, k, id: Math.random() };
}

export default function Stroop({ addScore, say }: GameProps) {
  const [r, setR] = useState(round);
  const [streak, setStreak] = useState(0);
  const [wrong, setWrong] = useState(false);
  const later = useTimers();

  function tap(k: number) {
    if (k === r.k) {
      addScore(1); const s = streak + 1; setStreak(s);
      if (s % 8 === 0) say(t('¡Mente ágil!'));
      setR(round());
    } else { setStreak(0); setWrong(true); later(() => setWrong(false), 300); }
  }

  return (
    <div className="game-col">
      <p className="small muted mb0 center">{t('Toca el COLOR de la tinta, no lo que dice la palabra.')}</p>
      <div key={r.id} className={`big-prompt pop-in${wrong ? ' shake' : ''}`} style={{ color: INKS[r.k].c }}>{t(INKS[r.w].n)}</div>
      <div className="choice-row">
        {INKS.map((ink, i) => <button key={i} className="swatch-btn big" style={{ background: ink.c }} onClick={() => tap(i)} aria-label={t(ink.n)} />)}
      </div>
    </div>
  );
}
