import { useEffect, useState } from 'react';
import type { ActivityProps } from '../ActivityRunner';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { EMOTION_BY_KEY } from '../../lib/catalog';
import { Spinner } from '../../components/ui';
import { t } from '../../i18n';

const MIN_SEC = 60;

export default function Music({ emotion, onComplete, busy }: ActivityProps) {
  // Spotify no permite reproducir sin un toque del usuario: la playlist queda lista para darle play.
  const { data: playlists } = useAsync(() => api.getPlaylists(), []);
  const [seconds, setSeconds] = useState(0);

  // Cuenta el tiempo solo mientras la pestaña está visible.
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') setSeconds((s) => s + 1); }, 1000);
    return () => clearInterval(id);
  }, []);

  const key = emotion ?? 'neutral';
  const pl = playlists?.find((p) => p.emotion === key);

  return (
    <div className="split-3-2">
      <div className="card" style={{ padding: 12 }}>
        {!pl ? <Spinner /> : (
          <iframe
            title={t('Playlist de Spotify: {title}', { title: pl.title })}
            src={`https://open.spotify.com/embed/playlist/${encodeURIComponent(pl.spotify_playlist_id)}?utm_source=generator&theme=0`}
            width="100%" height="380" style={{ border: 0, borderRadius: 12 }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"
          />
        )}
      </div>
      <div className="card">
        <div className="eyebrow" style={{ color: 'var(--red)' }}>{t('Para tu estado:')} {EMOTION_BY_KEY[key].emoji} {EMOTION_BY_KEY[key].label}</div>
        <h2>{pl?.title ?? '…'}</h2>
        <p className="muted small">{t('Dale play, cierra los ojos y concéntrate en la música. Con tu cuenta de Spotify abierta en el navegador escucharás las canciones completas; sin ella, vistas previas.')}</p>
        <p className="small">{t('Tiempo escuchando:')} <strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong></p>
        <button className="btn btn-primary btn-block" disabled={busy || seconds < MIN_SEC} onClick={() => onComplete({ durationSeconds: seconds })}>
          {seconds < MIN_SEC ? t('Completar (en {s} s)', { s: MIN_SEC - seconds }) : t('Completar actividad')}
        </button>
      </div>
    </div>
  );
}
