import { useEffect, useReducer, useRef } from 'react';
import { pick, type GameProps } from './types';

// FELIZ: atrapar estrellas aprovecha la energía positiva con un juego ágil.
const CHEERS = ['¡Qué buena racha!', '¡Brillas hoy!', '¡Sigue así!', '¡Energía pura!'];
interface Star { id: number; x: number; y: number; v: number; gold: boolean }
const BASKET_Y = 0.86;

export default function Stars({ addScore, say }: GameProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [, render] = useReducer((n: number) => n + 1, 0);
  const s = useRef({ x: 0.5, stars: [] as Star[], last: 0, spawn: 0, id: 1, caught: 0 });

  useEffect(() => {
    let raf = 0;
    const loop = (t: number) => {
      const st = s.current;
      const dt = st.last ? Math.min(50, t - st.last) / 1000 : 0;
      st.last = t;
      st.spawn -= dt;
      if (st.spawn <= 0) {
        st.stars.push({ id: st.id++, x: 0.05 + Math.random() * 0.9, y: -0.06, v: 0.28 + Math.random() * 0.3, gold: Math.random() < 0.12 });
        st.spawn = 0.5;
      }
      st.stars = st.stars.filter((star) => {
        star.y += star.v * dt;
        if (star.y > BASKET_Y - 0.06 && star.y < BASKET_Y + 0.06 && Math.abs(star.x - st.x) < 0.09) {
          addScore(star.gold ? 3 : 1);
          if (++st.caught % 8 === 0 || star.gold) say(pick(CHEERS));
          return false;
        }
        return star.y < 1.05;
      });
      render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') s.current.x = Math.max(0.06, s.current.x - 0.07);
      if (e.key === 'ArrowRight') s.current.x = Math.min(0.94, s.current.x + 0.07);
    };
    window.addEventListener('keydown', key);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', key); };
  }, [addScore, say]);

  const move = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    s.current.x = Math.min(0.94, Math.max(0.06, (clientX - r.left) / r.width));
  };

  return (
    <div ref={ref} className="game-layer" style={{ cursor: 'none' }}
      onPointerMove={(e) => move(e.clientX)} onPointerDown={(e) => move(e.clientX)}>
      {s.current.stars.map((st) => (
        <span key={st.id} className="sprite" style={{ left: `${st.x * 100}%`, top: `${st.y * 100}%`, fontSize: st.gold ? '2rem' : '1.6rem' }} aria-hidden>
          {st.gold ? '🌟' : '⭐'}
        </span>
      ))}
      <span className="sprite" style={{ left: `${s.current.x * 100}%`, top: `${BASKET_Y * 100}%`, fontSize: '2.6rem' }} aria-label="Canasta">🧺</span>
      <p className="game-tip">Mueve la canasta con el dedo, el mouse o las flechas ← →</p>
    </div>
  );
}
