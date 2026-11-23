import { useState, type CSSProperties } from 'react';
import type { ActivityProps } from '../ActivityRunner';
import { EMOTIONS, EMOTION_BY_KEY } from '../../lib/catalog';
import { GAME_BY_KEY, GAMES_FOR_EMOTION, nextGameFor } from './games';
import { GameShell } from './games/GameShell';
import type { GameDef } from './games/types';
import { t } from '../../i18n';

/** Minijuego: con emoción detectada arranca uno de sus 4 juegos (rotando); sin emoción, se elige. */
export default function Minigame({ emotion, onComplete, busy, autoStart }: ActivityProps) {
  const [key, setKey] = useState<string | null>(() => (emotion ? nextGameFor(emotion).key : null));
  const [picked, setPicked] = useState(false); // elegido a mano: también arranca solo
  const game = key ? GAME_BY_KEY[key] : undefined;

  if (!game) {
    // La emoción actual va primero; después las demás.
    const order = emotion ? [emotion, ...EMOTIONS.map((e) => e.key).filter((k) => k !== emotion)] : EMOTIONS.map((e) => e.key);
    const choose = (g: GameDef) => { setKey(g.key); setPicked(true); };
    return (
      <div className="stack" style={{ maxWidth: 860 }}>
        <p className="muted mb0">{t('Elige un juego. Hay cuatro pensados para cada emoción.')}</p>
        {order.map((k) => {
          const e = EMOTION_BY_KEY[k];
          return (
            <section key={k} className="stack" style={{ gap: 8 }}>
              <h3 className="mb0" style={{ color: e.color }}>{e.emoji} {k === emotion ? t('Para cómo te sientes ahora') : e.label}</h3>
              <div className="grid grid-2">
                {GAMES_FOR_EMOTION[k].map((g) => (
                  <button key={g.key} className="list-item" style={{ '--c': e.color } as CSSProperties} onClick={() => choose(g)}>
                    <span className="bubble" aria-hidden>{g.icon}</span>
                    <span className="grow"><strong>{g.name}</strong>
                      <span className="small muted" style={{ display: 'block' }}>{g.why}</span></span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  }
  return <GameShell key={game.key} game={game} autoStart={picked || autoStart}
    busy={busy} onComplete={onComplete} onPickOther={() => setKey(null)} />;
}
