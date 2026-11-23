import { useState, type CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useProfile } from '../context/AuthContext';
import { errMsg, useToast } from '../context/ToastContext';
import { ACTIVITIES, ACTIVITY_BY_KEY, EMOTION_BY_KEY } from '../lib/catalog';
import type { ActivityKey, EmotionKey } from '../lib/types';
import { PageHead, Spinner } from '../components/ui';

export default function Activities() {
  const [params] = useSearchParams();
  const profile = useProfile();
  const emotion = params.get('e') as EmotionKey | null;
  const detectionId = params.get('det');
  const assignmentId = params.get('a');
  const nav = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: recs, loading } = useAsync(
    () => (emotion && EMOTION_BY_KEY[emotion] ? api.getRecommendations(emotion) : Promise.resolve(null)),
    [emotion],
  );

  async function open(activity: ActivityKey, isPrimary: boolean) {
    if (isPrimary && assignmentId) return nav(`/actividad/${assignmentId}`);
    setBusy(activity);
    try {
      const id = await api.assignActivity(activity, detectionId);
      nav(`/actividad/${id}`);
    } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(null); }
  }

  const info = emotion ? EMOTION_BY_KEY[emotion] : null;

  return (
    <div className="page">
      <PageHead
        eyebrow={info ? 'Recomendado para ti' : 'Actividades'}
        color="var(--yellow)"
        title={info ? <>Basado en tu emoción: <span style={{ color: info.color }}>{info.emoji} {info.label}</span></> : 'Elige una actividad'}
        subtitle={info ? 'La primera es la más adecuada para este momento, pero puedes elegir cualquiera.' : 'Haz una detección para recibir una recomendación personalizada, o elige libremente.'}
      />
      {loading ? <Spinner /> : (
        <div className="stack" style={{ maxWidth: 720 }}>
          {(recs ?? ACTIVITIES.map((a) => ({ activity: a.key, priority: 0, reason: a.description }))).map((r, i) => {
            const a = ACTIVITY_BY_KEY[r.activity];
            const primary = !!recs && i === 0;
            return (
              <button key={a.key} className={`list-item${primary ? ' primary' : ''}`} style={{ '--c': a.color } as CSSProperties}
                onClick={() => open(a.key, primary)} disabled={!!busy || profile.suspended}>
                <span className="bubble" aria-hidden>{a.icon}</span>
                <span className="grow">
                  <span className="row" style={{ gap: 8 }}>
                    <strong>{a.name}</strong>
                    {primary && <span className="chip" style={{ '--c': a.color } as CSSProperties}><span className="chip-dot" />Recomendada</span>}
                  </span>
                  <span className="small muted" style={{ display: 'block' }}>{r.reason}</span>
                </span>
                <span className="small" style={{ color: 'var(--cyan)', whiteSpace: 'nowrap' }}>{busy === a.key ? '…' : `+${a.base_xp} XP ›`}</span>
              </button>
            );
          })}
          {!info && <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => nav('/detectar')}>📷 Detectar mi emoción</button>}
        </div>
      )}
    </div>
  );
}
