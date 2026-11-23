import { useMemo, useRef, useState } from 'react';
import type { ActivityProps } from '../ActivityRunner';
import { JOURNAL_PROMPTS } from '../../lib/catalog';

const MIN = 20;

export default function Journal({ emotion, onComplete, busy }: ActivityProps) {
  const prompts = JOURNAL_PROMPTS[emotion ?? 'free'];
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * prompts.length));
  const [text, setText] = useState('');
  const start = useRef(Date.now());
  const prompt = prompts[idx % prompts.length];
  const len = text.trim().length;
  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <div className="spread">
        <div className="eyebrow" style={{ color: 'var(--purple-soft)' }}>Pregunta guía</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setIdx((i) => i + 1)}>Otra pregunta ↻</button>
      </div>
      <h2>{prompt}</h2>
      <label htmlFor="journal" className="sr-only">Tu entrada del diario</label>
      <textarea id="journal" className="input mt" value={text} maxLength={5000} onChange={(e) => setText(e.target.value)}
        placeholder="Escribe con libertad. Nadie más puede leer tu diario." />
      <div className="spread mt">
        <span className="small faint">{words} palabras · {len < MIN ? `mínimo ${MIN} caracteres` : '¡Bien!'}</span>
        <button className="btn btn-primary" disabled={busy || len < MIN}
          onClick={() => onComplete({ durationSeconds: (Date.now() - start.current) / 1000, journalText: text, journalPrompt: prompt })}>
          Guardar entrada
        </button>
      </div>
      <p className="small faint mt mb0">🔒 Tus entradas son privadas: solo tú puedes verlas (política RLS).</p>
    </div>
  );
}
