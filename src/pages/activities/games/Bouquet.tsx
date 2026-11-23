import { useState } from 'react';
import { pick, randInt, shuffle, useTimers, type GameProps } from './types';
import { t } from '../../../i18n';

// DISGUSTO: armar un ramo fresco lleva la atención a algo agradable a la vista y al olfato.
const FLOWERS = ['🌷', '🌻', '🌹', '🌼', '🪻', '🌸'];

function round() {
  const kinds = shuffle(FLOWERS).slice(0, randInt(2, 3));
  const recipe = Object.fromEntries(kinds.map((k) => [k, randInt(1, 2)])) as Record<string, number>;
  const need = Object.entries(recipe).flatMap(([k, n]) => Array(n).fill(k) as string[]);
  const field = shuffle([...need, ...Array.from({ length: 12 - need.length }, () => pick(FLOWERS))]);
  return { recipe, field, used: field.map(() => false) };
}

export default function Bouquet({ addScore, say }: GameProps) {
  const [r, setR] = useState(round);
  const [wrong, setWrong] = useState<number | null>(null);
  const later = useTimers();
  const have = (k: string) => r.field.filter((f, i) => f === k && r.used[i]).length;
  const complete = Object.entries(r.recipe).every(([k, n]) => have(k) >= n);

  function tap(i: number) {
    if (complete || r.used[i]) return;
    const f = r.field[i];
    if (have(f) >= (r.recipe[f] ?? 0)) { setWrong(i); later(() => setWrong(null), 300); return; }
    const used = r.used.map((u, j) => u || j === i);
    const next = { ...r, used };
    setR(next);
    addScore(1);
    const done = Object.entries(next.recipe).every(([k, n]) => next.field.filter((x, j) => x === k && used[j]).length >= n);
    if (done) { addScore(2); say(t('¡Qué ramo tan bonito!')); later(() => setR(round()), 900); }
  }

  return (
    <div className="game-col">
      <div className="row" style={{ justifyContent: 'center', gap: 8 }} aria-label={t('Pedido del ramo')}>
        <span className="small muted">{t('Tu ramo lleva:')}</span>
        {Object.entries(r.recipe).map(([k, n]) => (
          <span key={k} className="chip" style={{ fontSize: '1rem', color: have(k) >= n ? 'var(--green)' : undefined }}>{k} {have(k)}/{n}</span>
        ))}
      </div>
      <div className="tile-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', width: 'min(320px, 100%)', gap: 8 }}>
        {r.field.map((f, i) => (
          <button key={i} className={`tile${r.used[i] ? ' used' : ''}${wrong === i ? ' shake' : ''}`} onClick={() => tap(i)} aria-label={f}>{f}</button>
        ))}
      </div>
    </div>
  );
}
