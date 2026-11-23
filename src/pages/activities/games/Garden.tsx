import { useRef, useState } from 'react';
import { pick, type GameProps } from './types';

// TRISTEZA: plantar flores con calma es una tarea suave y visible que levanta el ánimo.
const FLOWERS = ['🌸', '🌼', '🌷', '🌻', '🌺', '💐', '🪻'];
const KIND = ['Mereces cosas bonitas', 'Está bien sentirse así', 'Poco a poco florece', 'No estás solo', 'Hoy también cuenta', 'Eres importante'];
interface Flower { id: number; x: number; y: number; f: string }

export default function Garden({ addScore, say }: GameProps) {
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef(0);
  const count = useRef(0);
  const id = useRef(1);

  function plant(clientX: number, clientY: number) {
    const now = performance.now();
    if (now - last.current < 450) return; // con calma: una flor a la vez
    last.current = now;
    const r = ref.current!.getBoundingClientRect();
    const x = (clientX - r.left) / r.width;
    const y = Math.max(0.15, (clientY - r.top) / r.height);
    setFlowers((fs) => [...fs.slice(-40), { id: id.current++, x, y, f: pick(FLOWERS) }]);
    addScore(1);
    if (++count.current % 5 === 0) say(pick(KIND));
  }

  return (
    <div ref={ref} className="game-layer garden" onPointerDown={(e) => plant(e.clientX, e.clientY)}>
      {flowers.map((f) => (
        <span key={f.id} className="sprite grow" style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%` }} aria-hidden>{f.f}</span>
      ))}
      {flowers.length === 0 && <p className="game-tip" style={{ top: '45%' }}>Toca el jardín para plantar una flor 🌱<br />Sin prisa: una a la vez.</p>}
    </div>
  );
}
