import { useState, type CSSProperties } from 'react';
import type { ActivityProps } from '../ActivityRunner';
import { EMOTION_BY_KEY } from '../../lib/catalog';
import { GAMES, GAME_FOR_EMOTION } from './games';
import { GameShell } from './games/GameShell';
import { t } from '../../i18n';

/** Minijuego: según la emoción detectada se juega su juego; sin emoción, se elige uno. */
export default function Minigame({ emotion, onComplete, busy, autoStart }: ActivityProps) {
  const [key, setKey] = useState<string | null>(emotion ? GAME_FOR_EMOTION[emotion].key : null);
  const [picked, setPicked] = useState(false); // elegido a mano: también arranca solo
  const game = GAMES.find((g) => g.key === key);

  if (!game) {
    return (
      <div className="stack" style={{ maxWidth: 760 }}>
        <p className="muted mb0">{t('Elige un juego. Cada uno está pensado para una emoción.')}</p>
        <div className="grid grid-2">
          {GAMES.map((g) => {
            const e = EMOTION_BY_KEY[g.emotion];
            return (
              <button key={g.key} className="list-item" style={{ '--c': e.color } as CSSProperties} onClick={() => { setKey(g.key); setPicked(true); }}>
                <span className="bubble" aria-hidden>{g.icon}</span>
                <span className="grow"><strong>{g.name}</strong>
                  <span className="small muted" style={{ display: 'block' }}>{e.emoji} {e.label} · {g.why}</span></span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  return <GameShell key={game.key} game={game} autoStart={picked || autoStart}
    busy={busy} onComplete={onComplete} onPickOther={() => setKey(null)} />;
}
