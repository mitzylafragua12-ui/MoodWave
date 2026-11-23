import { useState } from 'react';
import { shuffle, useTimers, type GameProps } from './types';
import { t } from '../../../i18n';

// TRISTEZA: armar una imagen luminosa pieza por pieza es una tarea suave y con final feliz.
const SCENES = [
  ['☁️', '🌞', '☁️', '🐦', '🌈', '🕊️', '🌷', '🏡', '🌻'],
  ['🌙', '⭐', '✨', '🦉', '🌳', '🌲', '🍄', '🦔', '🌿'],
  ['🌤️', '⛵', '🐦', '🐬', '🌊', '🐠', '🐚', '🦀', '🪸'],
  ['🎈', '☀️', '🪁', '🌳', '🐕', '🌳', '🌼', '🛝', '🌷'],
];

function newBoard(scene: number) {
  const s = SCENES[scene];
  let tiles = shuffle(s.map((_, i) => i));
  while (tiles.every((v, i) => s[v] === s[i])) tiles = shuffle(tiles);
  return tiles;
}

export default function Puzzle({ addScore, say }: GameProps) {
  const [scene, setScene] = useState(() => Math.floor(Math.random() * SCENES.length));
  const [tiles, setTiles] = useState(() => newBoard(scene));
  const [sel, setSel] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const later = useTimers();
  const pic = SCENES[scene];
  const right = (ts: number[], i: number) => pic[ts[i]] === pic[i];

  function tap(i: number) {
    if (done) return;
    if (sel === null) { setSel(i); return; }
    if (sel === i) { setSel(null); return; }
    const next = [...tiles];
    [next[sel], next[i]] = [next[i], next[sel]];
    const gained = [sel, i].filter((k) => right(next, k) && !right(tiles, k)).length;
    if (gained) addScore(gained);
    setTiles(next); setSel(null);
    if (next.every((_, k) => right(next, k))) {
      setDone(true); addScore(3); say(t('¡Imagen completa!'));
      later(() => {
        const s = (scene + 1) % SCENES.length;
        setScene(s); setTiles(newBoard(s)); setDone(false);
      }, 1100);
    }
  }

  return (
    <div className="game-layer center-grid">
      <div className="puzzle-wrap">
        <div className="tile-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', width: 'min(270px, 58vw)', gap: 4 }}>
          {tiles.map((v, i) => (
            <button key={i} className={`tile${sel === i ? ' sel' : ''}${done || right(tiles, i) ? ' ok' : ''}`} onClick={() => tap(i)} aria-label={pic[v]}>{pic[v]}</button>
          ))}
        </div>
        <div className="stack center" style={{ gap: 4 }} title={t('Toca dos piezas para cambiarlas de lugar.')}>
          <span className="small muted">{t('Modelo')}</span>
          <div className="mini-grid">{pic.map((e, i) => <span key={i}>{e}</span>)}</div>
        </div>
      </div>
    </div>
  );
}
