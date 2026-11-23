import { useEffect, useState, type CSSProperties } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { errMsg, useToast } from '../context/ToastContext';
import { EMOTIONS } from '../lib/catalog';
import type { EmotionKey, Playlist } from '../lib/types';
import { ErrorBox, PageHead, Spinner } from '../components/ui';

/** Acepta un ID o una URL de Spotify (https://open.spotify.com/playlist/ID?si=...). */
export function parsePlaylistId(input: string): string | null {
  const m = input.trim().match(/(?:playlist[/:])?([A-Za-z0-9]{22})/);
  return m ? m[1] : null;
}

export default function Curation() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.getPlaylists(), []);
  const [draft, setDraft] = useState<Record<string, Playlist>>({});
  useEffect(() => { if (data) setDraft(Object.fromEntries(data.map((p) => [p.emotion, { ...p }]))); }, [data]);

  async function save(emotion: EmotionKey) {
    const p = draft[emotion];
    const id = parsePlaylistId(p.spotify_playlist_id);
    if (!id) return toast('Pega un enlace o ID de playlist de Spotify válido', 'error');
    try { await api.updatePlaylist(emotion, id, p.title.trim() || 'Playlist'); toast('Playlist actualizada'); reload(); }
    catch (e) { toast(errMsg(e), 'error'); }
  }

  return (
    <div className="page">
      <PageHead eyebrow="Curaduría" title="Playlists por emoción" color="var(--green)"
        subtitle="Define qué playlist de Spotify se recomienda para cada estado de ánimo. Pega el enlace de compartir de la playlist." />
      <ErrorBox error={error} />
      {loading ? <Spinner /> : (
        <div className="grid grid-2">
          {EMOTIONS.map((e) => {
            const p = draft[e.key];
            if (!p) return null;
            const id = parsePlaylistId(p.spotify_playlist_id);
            return (
              <div key={e.key} className="card card-accent" style={{ '--accent': e.color } as CSSProperties}>
                <h3>{e.emoji} {e.label}</h3>
                <div className="field"><label htmlFor={`t-${e.key}`}>Título</label>
                  <input id={`t-${e.key}`} className="input" value={p.title} onChange={(ev) => setDraft({ ...draft, [e.key]: { ...p, title: ev.target.value } })} /></div>
                <div className="field"><label htmlFor={`u-${e.key}`}>Enlace o ID de Spotify</label>
                  <input id={`u-${e.key}`} className="input" value={p.spotify_playlist_id} onChange={(ev) => setDraft({ ...draft, [e.key]: { ...p, spotify_playlist_id: ev.target.value } })} /></div>
                <div className="spread">
                  {id ? <a className="small" href={`https://open.spotify.com/playlist/${id}`} target="_blank" rel="noreferrer">Abrir en Spotify ↗</a> : <span className="small" style={{ color: 'var(--red)' }}>ID inválido</span>}
                  <button className="btn btn-primary btn-sm" onClick={() => save(e.key)}>Guardar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
