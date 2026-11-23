import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { pick, useTimers, type GameProps } from './types';
import { t, tm } from '../../../i18n';

// FELIZ: reventar globos del color pedido convierte la euforia en atención.
const COLORS = ['#ef4444', '#3b82f6', '#facc15', '#22c55e'];
const CHEERS = [tm('¡Qué buena racha!'), tm('¡Brillas hoy!'), tm('¡Sigue así!'), tm('¡Energía pura!')];
interface Balloon { id: number; x: number; size: number; t: number; sway: number; c: number; popped: boolean }

export default function Balloons({ addScore, say }: GameProps) {
  const [target, setTarget] = useState(() => Math.floor(Math.random() * COLORS.length));
  const targetRef = useRef(target);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const area = useRef<HTMLDivElement>(null);
  const next = useRef(1);
  const hits = useRef(0);
  const later = useTimers();

  useEffect(() => {
    const spawn = setInterval(() => {
      const c = Math.random() < 0.45 ? targetRef.current : Math.floor(Math.random() * COLORS.length);
      setBalloons((bs) => [...bs.slice(-22), { id: next.current++, x: 4 + Math.random() * 84, size: 54 + Math.random() * 20, t: 4.5 + Math.random() * 3, sway: (Math.random() - 0.5) * 50, c, popped: false }]);
    }, 480);
    const change = setInterval(() => {
      const n = (targetRef.current + 1 + Math.floor(Math.random() * (COLORS.length - 1))) % COLORS.length;
      targetRef.current = n; setTarget(n);
      say(t('¡Cambio de color!'));
    }, 9000);
    return () => { clearInterval(spawn); clearInterval(change); };
  }, [say]);

  const pop = useCallback((b: Balloon) => {
    if (b.popped) return;
    setBalloons((bs) => bs.map((x) => (x.id === b.id ? { ...x, popped: true } : x)));
    later(() => setBalloons((bs) => bs.filter((x) => x.id !== b.id)), 230);
    if (b.c === targetRef.current) { addScore(1); if (++hits.current % 8 === 0) say(t(pick(CHEERS))); }
    else say(t('Ese no es el color'));
  }, [addScore, say, later]);

  const h = area.current?.clientHeight ?? 460;
  return (
    <div ref={area} className="game-layer">
      <div className="target-chip chip">{t('Revienta los globos de este color')} <span className="swatch" style={{ background: COLORS[target] }} /></div>
      {balloons.map((b) => (
        <button key={b.id} className={`bubble-go balloon${b.popped ? ' popped' : ''}`} aria-label={t('Globo')}
          style={{ left: `${b.x}%`, width: b.size, height: b.size * 1.18, '--t': `${b.t}s`, '--h': `${h}px`, '--sway': `${b.sway}px`, '--c': COLORS[b.c] } as CSSProperties}
          onPointerDown={() => pop(b)}
          onAnimationEnd={(e) => { if (e.animationName === 'rise') setBalloons((bs) => bs.filter((x) => x.id !== b.id)); }} />
      ))}
    </div>
  );
}
