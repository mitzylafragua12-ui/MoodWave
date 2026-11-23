import { useEffect, useRef, useState } from 'react';
import { pick, type GameProps } from './types';

// DISGUSTO: limpiar una ventana sucia cambia el foco y deja una imagen agradable.
const SCENES = [
  { bg: 'linear-gradient(180deg,#38bdf8,#a7f3d0)', art: '🏔️' },
  { bg: 'linear-gradient(180deg,#fb923c,#f9a8d4)', art: '🌅' },
  { bg: 'linear-gradient(180deg,#22d3ee,#1e3a8a)', art: '🌊' },
  { bg: 'linear-gradient(180deg,#86efac,#166534)', art: '🌳' },
  { bg: 'linear-gradient(180deg,#c4b5fd,#312e81)', art: '🌙' },
];
const DONE = ['¡Reluciente!', '¡Mucho mejor!', 'Aire fresco ✨', '¡Qué vista!'];

export default function Wipe({ addScore, say }: GameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState(() => Math.floor(Math.random() * SCENES.length));
  const [cleared, setCleared] = useState(0);
  const drawing = useRef(false);

  useEffect(() => { dirty(canvas.current!); setCleared(0); }, [scene]);

  useEffect(() => {
    const id = setInterval(() => {
      const c = canvas.current;
      if (!c) return;
      const ratio = clearedRatio(c);
      setCleared(ratio);
      if (ratio >= 0.8) {
        addScore(1);
        say(pick(DONE));
        setScene((s) => (s + 1) % SCENES.length);
      }
    }, 350);
    return () => clearInterval(id);
  }, [addScore, say]);

  function wipe(clientX: number, clientY: number) {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    const ctx = c.getContext('2d')!;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(((clientX - r.left) / r.width) * c.width, ((clientY - r.top) / r.height) * c.height, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  return (
    <div className="game-layer" style={{ background: SCENES[scene].bg }}>
      <span className="sprite" style={{ left: '50%', top: '55%', fontSize: '7rem' }} aria-hidden>{SCENES[scene].art}</span>
      <canvas ref={canvas} width={640} height={460} className="wipe-canvas" aria-label="Ventana sucia: arrastra para limpiarla"
        onPointerDown={(e) => { drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); wipe(e.clientX, e.clientY); }}
        onPointerMove={(e) => { if (drawing.current) wipe(e.clientX, e.clientY); }}
        onPointerUp={() => { drawing.current = false; }} />
      <span className="chip" style={{ position: 'absolute', left: '50%', bottom: 12, transform: 'translateX(-50%)', pointerEvents: 'none' }}>🧽 {Math.round(cleared * 100)}% limpio</span>
    </div>
  );
}

function dirty(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d')!;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#5b5a3a';
  ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = pick(['#4d5e2e', '#6b5a35', '#3f4a2a', '#7a6b42']);
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(Math.random() * c.width, Math.random() * c.height, 20 + Math.random() * 60, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function clearedRatio(c: HTMLCanvasElement) {
  const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  let clear = 0;
  let total = 0;
  for (let i = 3; i < data.length; i += 4 * 16) { total++; if (data[i] < 40) clear++; }
  return total ? clear / total : 0;
}
