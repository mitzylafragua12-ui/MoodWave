import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { pick, type GameProps } from './types';
import { t, tm } from '../../../i18n';

// TRISTEZA: soltar faroles despacio invita a ir sin prisa y a hablarte con cariño.
const KIND = [tm('Está bien sentirse así'), tm('Mereces descanso'), tm('No tienes que pasarlo a solas'), tm('Poco a poco'), tm('Mañana puede ser más ligero'), tm('Eres importante')];
interface Lantern { id: number; x: number; y: number; drift: number }

export default function Lanterns({ addScore, say }: GameProps) {
  const [lanterns, setLanterns] = useState<Lantern[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef(0);
  const n = useRef(0);

  function release(e: PointerEvent) {
    const r = ref.current!.getBoundingClientRect();
    const now = performance.now();
    const calm = now - last.current >= 1500; // sin prisa vale doble
    last.current = now;
    setLanterns((ls) => [...ls.slice(-24), { id: ++n.current, x: ((e.clientX - r.left) / r.width) * 100, y: e.clientY - r.top, drift: (Math.random() - 0.5) * 60 }]);
    addScore(calm ? 2 : 1);
    if (n.current % 5 === 0) say(t(pick(KIND)));
  }

  return (
    <div ref={ref} className="game-layer night" onPointerDown={release}>
      {lanterns.map((l) => (
        <span key={l.id} className="lantern" style={{ left: `${l.x}%`, top: l.y, '--drift': `${l.drift}px` } as CSSProperties}
          onAnimationEnd={() => setLanterns((ls) => ls.filter((x) => x.id !== l.id))} aria-hidden>🏮</span>
      ))}
      <p className="game-tip">{t('Toca el cielo para soltar un farol. Sin prisa: los faroles lentos valen doble.')}</p>
    </div>
  );
}
