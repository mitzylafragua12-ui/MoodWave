import { useRef, useState } from 'react';
import { pick, useTimers, type GameProps } from './types';
import { t, tm } from '../../../i18n';

// DISGUSTO: separar residuos convierte el rechazo en una acción útil y ordenada.
const RECYCLE = ['🍾', '🥫', '📰', '📦', '🧴', '🥤', '🫙', '🔩', '🧃'];
const ORGANIC = ['🍌', '🍎', '🥕', '🍂', '🥚', '🍞', '🌽', '🍉', '🥔'];
const CHEERS = [tm('¡Qué limpio!'), tm('Así da gusto'), tm('¡Muy bien separado!')];
const item = () => (Math.random() < 0.5 ? { e: pick(RECYCLE), organic: false } : { e: pick(ORGANIC), organic: true });

export default function Sort({ addScore, say }: GameProps) {
  const [it, setIt] = useState(item);
  const [wrong, setWrong] = useState(false);
  const streak = useRef(0);
  const later = useTimers();

  function choose(organic: boolean) {
    if (organic === it.organic) {
      addScore(1);
      if (++streak.current % 6 === 0) say(t(pick(CHEERS)));
    } else {
      streak.current = 0; setWrong(true); say(t('Ese va en el otro bote'));
      later(() => setWrong(false), 300);
    }
    let n = item();
    while (n.e === it.e) n = item();
    setIt(n);
  }

  return (
    <div className="game-col">
      <div key={it.e} className={`pop-in${wrong ? ' shake' : ''}`} style={{ fontSize: '4.4rem' }} aria-live="polite">{it.e}</div>
      <div className="choice-row">
        <button className="choice" onClick={() => choose(false)}>♻️ {t('Reciclable')}</button>
        <button className="choice" onClick={() => choose(true)}>🌱 {t('Orgánico')}</button>
      </div>
    </div>
  );
}
