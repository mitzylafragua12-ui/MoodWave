import { useState } from 'react';
import { pick, useTimers, type GameProps } from './types';
import { t, tm } from '../../../i18n';

// TRISTEZA: elegir la respuesta amable a un pensamiento duro practica la autocompasión.
const THOUGHTS: [thought: string, kind: string, harsh: string][] = [
  [tm('Nada me sale bien.'), tm('Hoy fue difícil, pero antes he logrado cosas.'), tm('Siempre lo arruino todo.')],
  [tm('Nadie me entiende.'), tm('Puedo buscar a alguien de confianza para hablar.'), tm('Mejor ya no hablo con nadie.')],
  [tm('No tengo energía para nada.'), tm('Descansar también es avanzar.'), tm('Soy un desastre.')],
  [tm('Me equivoqué otra vez.'), tm('Equivocarme es parte de aprender.'), tm('No sirvo para esto.')],
  [tm('Estoy triste y no sé por qué.'), tm('Mis emociones son válidas aunque no las entienda.'), tm('Debería dejar de sentir esto ya.')],
  [tm('Los demás lo hacen mejor que yo.'), tm('Voy a mi propio ritmo.'), tm('Nunca voy a ser suficiente.')],
  [tm('Hoy no hice nada útil.'), tm('Cuidarme hoy también cuenta.'), tm('Perdí el día por completo.')],
  [tm('Extraño cómo eran las cosas.'), tm('Puedo guardar lo bueno y crear momentos nuevos.'), tm('Nada volverá a estar bien.')],
];
const CHEERS = [tm('Eso es tratarte con cariño'), tm('Así se habla'), tm('Muy bien dicho')];

export default function Kind({ addScore }: GameProps) {
  const [i, setI] = useState(() => Math.floor(Math.random() * THOUGHTS.length));
  const [flip, setFlip] = useState(() => Math.random() < 0.5);
  const [wrong, setWrong] = useState(false);
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);
  const later = useTimers();
  const [thought, kind, harsh] = THOUGHTS[i];
  const options = flip ? [harsh, kind] : [kind, harsh];

  function choose(text: string) {
    if (text === kind) {
      addScore(1); setNote({ text: t(pick(CHEERS)), ok: true });
      setI((x) => (x + 1 + Math.floor(Math.random() * (THOUGHTS.length - 1))) % THOUGHTS.length);
      setFlip(Math.random() < 0.5);
    } else {
      setWrong(true); setNote({ text: t('Prueba con la opción más amable'), ok: false });
      later(() => setWrong(false), 350);
    }
  }

  return (
    <div className="game-col">
      <p className="small muted mb0">{t('Elige la respuesta más amable para este pensamiento:')}</p>
      <div className="thought">“{t(thought)}”</div>
      <div className={`stack${wrong ? ' shake' : ''}`} style={{ gap: 10, width: 'min(420px, 100%)' }}>
        {options.map((o) => <button key={o} className="choice text" onClick={() => choose(o)}>{t(o)}</button>)}
      </div>
      <p className="small mb0" aria-live="polite" style={{ minHeight: '1.4em', fontWeight: 700, color: note?.ok ? 'var(--green)' : 'var(--yellow)' }}>{note?.text}</p>
    </div>
  );
}
