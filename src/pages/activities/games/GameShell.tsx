import { useCallback, useEffect, useRef, useState } from 'react';
import { EMOTION_BY_KEY } from '../../../lib/catalog';
import type { CompletionInput } from '../../../lib/types';
import type { GameDef } from './types';
import { t } from '../../../i18n';

type State = 'ready' | 'countdown' | 'playing' | 'over';
const MIN_SEC = 20;

/** Cuenta regresiva, marcador, tiempo, mensajes flotantes y cierre comunes a todos los juegos. */
export function GameShell({ game, autoStart, busy, onComplete, onPickOther }: {
  game: GameDef; autoStart: boolean; busy: boolean;
  onComplete: (input: CompletionInput) => void; onPickOther: () => void;
}) {
  const [state, setState] = useState<State>(autoStart ? 'countdown' : 'ready');
  const [count, setCount] = useState(3);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [left, setLeft] = useState(game.seconds);
  const [round, setRound] = useState(0);
  const [msg, setMsg] = useState<{ id: number; text: string } | null>(null);
  const total = useRef(0);
  const scoreRef = useRef(0);

  const addScore = useCallback((n: number) => { scoreRef.current += n; setScore(scoreRef.current); }, []);
  const say = useCallback((text: string) => setMsg({ id: Date.now() + Math.random(), text }), []);

  useEffect(() => {
    if (state !== 'countdown') return;
    setCount(3);
    const id = setInterval(() => setCount((c) => {
      if (c <= 1) { clearInterval(id); setState('playing'); return 0; }
      return c - 1;
    }), 800);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => {
    if (state !== 'playing') return;
    scoreRef.current = 0; setScore(0); setLeft(game.seconds); setRound((r) => r + 1);
    const end = Date.now() + game.seconds * 1000;
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        clearInterval(id);
        total.current += game.seconds;
        setBest((b) => Math.max(b, scoreRef.current));
        setState('over');
      }
    }, 200);
    return () => clearInterval(id);
  }, [state, game.seconds]);

  const Game = game.Component;
  const emotion = EMOTION_BY_KEY[game.emotion];

  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <div className="game-area">
        <div className="game-hud">
          <span className="chip">{game.icon} {score} pts</span>
          <span className="chip">⏱ {left}s</span>
        </div>
        {state === 'playing' && <Game key={round} addScore={addScore} say={say} />}
        {msg && <div key={msg.id} className="affirmation" onAnimationEnd={() => setMsg(null)}>{msg.text}</div>}
        {state !== 'playing' && (
          <div className="camera-overlay">
            <div className="stack center" style={{ alignItems: 'center', maxWidth: 420 }}>
              <div style={{ fontSize: '2.6rem' }} aria-hidden>{game.icon}</div>
              <h2 className="mb0">{game.name}</h2>
              <span className="chip">{emotion.emoji} {t('Para')} {emotion.label.toLowerCase()}</span>
              {state === 'over' ? (
                <>
                  <div className="xp-burst">{score}</div>
                  <p className="muted mb0">{t('puntos')} {best > score && <>{t('· tu mejor ronda:')} {best}</>}</p>
                  <div className="row" style={{ justifyContent: 'center' }}>
                    <button className="btn btn-ghost" onClick={() => setState('countdown')}>{t('Otra ronda')}</button>
                    <button className="btn btn-primary" disabled={busy || total.current < MIN_SEC}
                      onClick={() => onComplete({ durationSeconds: total.current, score: Math.max(best, score), game: game.key })}>
                      {t('Completar actividad')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="muted mb0">{game.howTo}</p>
                  <p className="small faint mb0">{game.why}</p>
                  {state === 'countdown'
                    ? <div className="countdown" aria-live="assertive">{count || t('¡Ya!')}</div>
                    : <button className="btn btn-cyan" onClick={() => setState('countdown')}>{t('Jugar')}</button>}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {state !== 'playing' && <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={onPickOther}>{t('🎮 Elegir otro juego')}</button>}
    </div>
  );
}
