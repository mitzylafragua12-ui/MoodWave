import { useState } from 'react';
import { useTimers, type GameProps } from './types';
import { t } from '../../../i18n';

// MIEDO: encender una casa a oscuras, ventana por ventana, devuelve la sensación de control.
function press(on: boolean[], size: number, i: number) {
  const r = Math.floor(i / size), c = i % size;
  const out = [...on];
  for (const [dr, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < size && cc >= 0 && cc < size) out[rr * size + cc] = !out[rr * size + cc];
  }
  return out;
}
function puzzle(size: number, moves: number) {
  let on = Array(size * size).fill(true) as boolean[];
  while (on.every(Boolean)) {
    on = Array(size * size).fill(true);
    for (let k = 0; k < moves; k++) on = press(on, size, Math.floor(Math.random() * size * size));
  }
  return on;
}

export default function Lights({ addScore, say }: GameProps) {
  const [solved, setSolved] = useState(0);
  const size = solved < 3 ? 3 : 4;
  const [on, setOn] = useState(() => puzzle(3, 2));
  const [done, setDone] = useState(false);
  const later = useTimers();

  function tap(i: number) {
    if (done) return;
    const next = press(on, size, i);
    setOn(next);
    if (next.every(Boolean)) {
      setDone(true); addScore(size === 3 ? 3 : 5); say(t('¡Todo iluminado!'));
      later(() => {
        const s = solved + 1;
        setSolved(s); setOn(puzzle(s < 3 ? 3 : 4, 2 + Math.min(3, Math.floor(s / 2)))); setDone(false);
      }, 900);
    }
  }

  return (
    <div className="game-col">
      <div className="tile-grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: `min(${size * 80}px, 80vw)`, gap: 8 }}>
        {on.map((v, i) => <button key={`${solved}-${i}`} className={`light${v ? ' on' : ''}`} onClick={() => tap(i)} aria-label={v ? t('Ventana encendida') : t('Ventana apagada')} aria-pressed={v} />)}
      </div>
      <p className="small muted center mb0" style={{ maxWidth: 340 }}>{t('Cada ventana que tocas cambia junto con sus vecinas. Enciéndelas todas.')}</p>
    </div>
  );
}
