import { useEffect, useRef, useState } from 'react';
import { pick, tone, useTimers, type GameProps } from './types';
import { t, tm } from '../../../i18n';

// ENOJO: golpear un tambor descarga la energía; seguir el pulso, que se va haciendo más lento, ayuda a bajar las revoluciones.
const CALM = [tm('Respira, vas bien'), tm('Suelta lo que pesa'), tm('Tú tienes el control'), tm('Esto también pasará'), tm('Un paso a la vez')];

export default function Drum({ addScore, say }: GameProps) {
  const [beat, setBeat] = useState(0);
  const [hit, setHit] = useState<'good' | 'off' | null>(null);
  const [bpm, setBpm] = useState(100);
  const lastBeat = useRef(0);
  const nextBeat = useRef(0);
  const lastHit = useRef(0);
  const streak = useRef(0);
  const later = useTimers();

  useEffect(() => {
    const start = performance.now();
    let timer = 0;
    const schedule = () => {
      const now = performance.now();
      lastBeat.current = now;
      setBeat((b) => b + 1);
      tone(196, 90, 'triangle', 0.05);
      // Empieza a 100 pulsos por minuto y baja hasta ~55 en 40 s.
      const period = Math.min(1100, 600 + ((now - start) / 40000) * 500);
      setBpm(Math.round(60000 / period));
      nextBeat.current = now + period;
      timer = window.setTimeout(schedule, period);
    };
    timer = window.setTimeout(schedule, 700);
    return () => clearTimeout(timer);
  }, []);

  function strike() {
    const now = performance.now();
    tone(90, 240, 'sine', 0.3);
    if (now - lastHit.current < 160) return; // golpes en ráfaga no cuentan
    lastHit.current = now;
    const near = Math.min(now - lastBeat.current, Math.max(0, nextBeat.current - now));
    if (near < 190) {
      addScore(2); setHit('good');
      if (++streak.current % 8 === 0) say(t(pick(CALM)));
    } else { streak.current = 0; setHit('off'); }
    later(() => setHit(null), 160);
  }

  return (
    <div className="game-col">
      <button key={beat} className={`drum beat${hit ? ` ${hit}` : ''}`} onPointerDown={strike} aria-label={t('Tambor')}>🥁</button>
      <span className="chip">♩ {bpm} {t('pulsos por minuto')}</span>
      <p className="small muted center mb0" style={{ maxWidth: 360 }}>{t('Golpea el tambor cuando se ilumina. El ritmo se irá calmando.')}</p>
    </div>
  );
}
