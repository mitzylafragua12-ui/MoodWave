import { useState } from 'react';
import { randInt, shuffle, useTimers, type GameProps } from './types';
import { t } from '../../../i18n';

// NEUTRAL: cuentas rápidas despiertan la mente sin cargarla emocionalmente.
function question(level: number) {
  let a: number, b: number, op: string, ans: number;
  if (level < 5) { a = randInt(1, 9); b = randInt(1, 9); op = '+'; ans = a + b; }
  else if (level < 10) {
    if (Math.random() < 0.5) { a = randInt(5, 20); b = randInt(2, 15); op = '+'; ans = a + b; }
    else { a = randInt(8, 25); b = randInt(1, a); op = '−'; ans = a - b; }
  } else { a = randInt(2, 9); b = randInt(2, 9); op = '×'; ans = a * b; }
  const opts = new Set([ans]);
  while (opts.size < 3) { const d = ans + (Math.random() < 0.5 ? -1 : 1) * randInt(1, 4); if (d >= 0) opts.add(d); }
  return { text: `${a} ${op} ${b}`, ans, opts: shuffle([...opts]) };
}

export default function QuickMath({ addScore, say }: GameProps) {
  const [level, setLevel] = useState(0);
  const [q, setQ] = useState(() => question(0));
  const [wrong, setWrong] = useState<number | null>(null);
  const later = useTimers();

  function answer(v: number) {
    if (v === q.ans) {
      addScore(level < 10 ? 1 : 2);
      const l = level + 1; setLevel(l);
      if (l % 5 === 0) say(t('¡Mente ágil!'));
      setQ(question(l));
    } else { setWrong(v); later(() => setWrong(null), 300); }
  }

  return (
    <div className="game-col">
      <div className="big-prompt">{q.text} = ?</div>
      <div className="choice-row">
        {q.opts.map((o) => <button key={`${q.text}-${o}`} className={`choice${wrong === o ? ' shake' : ''}`} onClick={() => answer(o)}>{o}</button>)}
      </div>
    </div>
  );
}
