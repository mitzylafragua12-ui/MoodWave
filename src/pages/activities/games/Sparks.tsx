import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { pick, useTimers, type GameProps } from './types';
import { t, tm } from '../../../i18n';

// ENOJO: apagar chispas antes de que crezcan es una imagen de cómo calmar el enojo a tiempo.
const CALM = [tm('Respira, vas bien'), tm('Suelta lo que pesa'), tm('Tú tienes el control'), tm('Esto también pasará')];
interface Spark { id: number; x: number; y: number; born: number; out: boolean }

export default function Sparks({ addScore, say }: GameProps) {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const next = useRef(1);
  const count = useRef(0);
  const later = useTimers();

  useEffect(() => {
    const id = setInterval(() => {
      setSparks((ss) => [...ss.slice(-14), { id: next.current++, x: 8 + Math.random() * 84, y: 22 + Math.random() * 68, born: performance.now(), out: false }]);
    }, 650);
    return () => clearInterval(id);
  }, []);

  function douse(s: Spark) {
    if (s.out) return;
    setSparks((ss) => ss.map((x) => (x.id === s.id ? { ...x, out: true } : x)));
    later(() => setSparks((ss) => ss.filter((x) => x.id !== s.id)), 320);
    addScore(performance.now() - s.born < 1200 ? 2 : 1);
    if (++count.current % 10 === 0) say(t(pick(CALM)));
  }

  return (
    <div className="game-layer">
      {sparks.map((s) => (
        <button key={s.id} className={`spark${s.out ? ' out' : ''}`} style={{ left: `${s.x}%`, top: `${s.y}%` } as CSSProperties}
          onPointerDown={() => douse(s)} aria-label={t('Chispa')}
          onAnimationEnd={(e) => { if (e.animationName === 'flare') setSparks((ss) => ss.filter((x) => x.id !== s.id)); }}>
          {s.out ? '💨' : '🔥'}
        </button>
      ))}
      <p className="game-tip">{t('Apaga las chispas tocándolas. Si las apagas pequeñas valen doble.')}</p>
    </div>
  );
}
