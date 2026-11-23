import { useState } from 'react';
import { useTimers, type GameProps } from './types';
import { t } from '../../../i18n';

// DISGUSTO: colorear un mandala reemplaza la sensación desagradable por algo bello y repetitivo.
const PALETTE = ['#f472b6', '#a78bfa', '#22d3ee', '#4ade80', '#facc15', '#fb923c'];
const SEGMENTS = [6, 8, 10, 12];

const pt = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
function arc(r1: number, r2: number, a1: number, a2: number) {
  return `M ${pt(r2, a1)} A ${r2} ${r2} 0 0 1 ${pt(r2, a2)} L ${pt(r1, a2)} A ${r1} ${r1} 0 0 0 ${pt(r1, a1)} Z`;
}
function shapes(n: number) {
  const out: { id: string; d: string }[] = [];
  const rings: [number, number, number, number][] = [[10, 22, n, 0], [22, 34, n, 0.5], [34, 46, n * 2, 0]];
  rings.forEach(([r1, r2, count, off], ri) => {
    for (let i = 0; i < count; i++) {
      const a1 = ((i + off) / count) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((i + 1 + off) / count) * Math.PI * 2 - Math.PI / 2;
      out.push({ id: `${ri}-${i}`, d: arc(r1, r2, a1, a2) });
    }
  });
  return out;
}

export default function Mandala({ addScore, say }: GameProps) {
  const [level, setLevel] = useState(0);
  const [color, setColor] = useState(PALETTE[0]);
  const [fills, setFills] = useState<Record<string, string>>({});
  const later = useTimers();
  const segs = shapes(SEGMENTS[level % SEGMENTS.length]);
  const total = segs.length + 1;

  function paint(id: string) {
    if (Object.keys(fills).length === total) return;
    const next = { ...fills, [id]: color };
    if (!fills[id]) addScore(1);
    setFills(next);
    if (Object.keys(next).length === total) {
      addScore(5); say(t('¡Precioso!'));
      later(() => { setLevel((l) => l + 1); setFills({}); }, 1300);
    }
  }

  return (
    <div className="game-col" style={{ gap: 10 }}>
      <svg viewBox="-50 -50 100 100" className="mandala" role="img" aria-label={t('Mandala para colorear')}>
        <circle r={10} fill={fills.c ?? 'var(--surface-2)'} onClick={() => paint('c')} />
        {segs.map((s) => <path key={`${level}-${s.id}`} d={s.d} fill={fills[s.id] ?? 'var(--surface-2)'} onClick={() => paint(s.id)} />)}
      </svg>
      <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
        {PALETTE.map((c) => (
          <button key={c} className={`swatch-btn${c === color ? ' sel' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={t('Color')} aria-pressed={c === color} />
        ))}
      </div>
    </div>
  );
}
