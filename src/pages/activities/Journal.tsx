import { useMemo, useRef, useState } from 'react';
import type { ActivityProps } from '../ActivityRunner';
import { JOURNAL_PROMPTS } from '../../lib/catalog';
import { t } from '../../i18n';

const MIN = 20;

export default function Journal({ emotion, onComplete, busy, autoStart }: ActivityProps) {
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
        <div className="eyebrow" style={{ color: 'var(--purple-soft)' }}>{t('Pregunta guía')}</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setIdx((i) => i + 1)}>{t('Otra pregunta ↻')}</button>
      </div>
      <h2>{t(prompt)}</h2>
      <label htmlFor="journal" className="sr-only">{t('Tu entrada del diario')}</label>
      <textarea id="journal" autoFocus={autoStart} className="input mt" value={text} maxLength={5000} onChange={(e) => setText(e.target.value)}
        placeholder={t('Escribe con libertad. Nadie más puede leer tu diario.')} />
      <div className="spread mt">
        <span className="small faint">{t('{n} palabras', { n: words })} · {len < MIN ? t('mínimo {n} caracteres', { n: MIN }) : t('¡Bien!')}</span>
        <button className="btn btn-primary" disabled={busy || len < MIN}
          onClick={() => onComplete({ durationSeconds: (Date.now() - start.current) / 1000, journalText: text, journalPrompt: prompt })}>
          {t('Guardar entrada')}
        </button>
      </div>
      <p className="small faint mt mb0">{t('🔒 Tus entradas son privadas: solo tú puedes verlas (política RLS).')}</p>
    </div>
  );
}
