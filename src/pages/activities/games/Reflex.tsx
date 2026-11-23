import { useEffect, useRef, useState } from 'react';
import { randInt, useTimers, type GameProps } from './types';
import { t } from '../../../i18n';

// SORPRESA: esperar la señal y reaccionar entrena a responder a lo inesperado con calma.
type Phase = 'wait' | 'go' | 'early' | 'result';

export default function Reflex({ addScore, say }: GameProps) {
  const [phase, setPhase] = useState<Phase>('wait');
  const [round, setRound] = useState(0);
  const [ms, setMs] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const goAt = useRef(0);
  const later = useTimers();

  useEffect(() => {
    later(() => { goAt.current = performance.now(); setPhase('go'); }, randInt(1100, 3000));
  }, [round, later]);

  function tap() {
    if (phase === 'wait') {
      setPhase('early'); say(t('¡Muy pronto! Espera la luz verde'));
      later(() => { setPhase('wait'); setRound((r) => r + 1); }, 1000);
    } else if (phase === 'go') {
      const m = Math.round(performance.now() - goAt.current);
      setMs(m); setBest((b) => (b === null ? m : Math.min(b, m)));
      addScore(m < 350 ? 3 : m < 500 ? 2 : 1);
      setPhase('result');
      later(() => { setPhase('wait'); setRound((r) => r + 1); }, 900);
    }
  }

  return (
    <div className="game-col">
      <button className={`reflex ${phase}`} onPointerDown={tap}>
        {phase === 'wait' ? t('Espera la luz verde…') : phase === 'go' ? t('¡Ahora!') : phase === 'early' ? t('Muy pronto') : `${ms} ms`}
      </button>
      {best !== null && <span className="chip">{t('Tu mejor tiempo: {ms} ms', { ms: best })}</span>}
    </div>
  );
}
