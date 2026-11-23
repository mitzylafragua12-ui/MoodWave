import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameProps } from './types';

// MIEDO: sincronizar la respiración con el faro baja la activación y ancla al presente.
const PHASES = [
  { name: 'Inhala', sec: 4, press: true, scale: 1.35 },
  { name: 'Sostén', sec: 2, press: true, scale: 1.35 },
  { name: 'Exhala', sec: 5, press: false, scale: 0.75 },
] as const;
const CYCLE = PHASES.reduce((s, p) => s + p.sec, 0);

export default function Breath({ addScore, say }: GameProps) {
  const [pressed, setPressed] = useState(false);
  const [t, setT] = useState(0);
  const pressedRef = useRef(false);
  const inSync = useRef(0);
  const start = useRef(performance.now());

  useEffect(() => {
    const id = setInterval(() => {
      const el = (performance.now() - start.current) / 1000;
      setT(el);
      const phase = phaseAt(el);
      if (pressedRef.current === phase.press) {
        inSync.current++;
        if (inSync.current % 10 === 0) addScore(1); // 1 punto por segundo en sincronía
        if (inSync.current % 110 === 0) say('Lo estás haciendo muy bien');
      }
    }, 100);
    const down = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); set(true); } };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') set(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { clearInterval(id); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [addScore, say]);

  function set(v: boolean) { pressedRef.current = v; setPressed(v); }
  const phase = phaseAt(t);
  const ok = pressed === phase.press;

  return (
    <div className="game-layer breath-game" onPointerDown={() => set(true)} onPointerUp={() => set(false)} onPointerLeave={() => set(false)}>
      <div className="lighthouse" style={{ transform: `scale(${phase.scale})`, transitionDuration: `${phase.sec}s`, '--glow': ok ? 'var(--cyan)' : 'var(--faint)' } as CSSProperties}>
        <span aria-hidden>🗼</span>
      </div>
      <div className="phase" aria-live="polite" style={{ marginTop: 52 }}>{phase.name}</div>
      <p className="small muted center" style={{ margin: '6px 16px 0' }}>
        {phase.press ? 'Mantén presionado mientras inhalas y sostienes' : 'Suelta mientras exhalas'} · <span style={{ color: ok ? 'var(--green)' : 'var(--yellow)' }}>{ok ? 'en sincronía' : 'ajusta'}</span>
      </p>
      <p className="game-tip" style={{ top: 'auto', bottom: 10 }}>Toca y mantén la pantalla (o la barra espaciadora)</p>
    </div>
  );
}

function phaseAt(sec: number) {
  let x = sec % CYCLE;
  for (const p of PHASES) { if (x < p.sec) return p; x -= p.sec; }
  return PHASES[0];
}
