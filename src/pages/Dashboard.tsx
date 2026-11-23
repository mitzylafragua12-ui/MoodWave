import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../context/AuthContext';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { LEVEL_NAMES, levelProgress, DAILY_XP_CAP } from '../lib/gamification';
import { ACTIVITY_BY_KEY } from '../lib/catalog';
import { fmtDateTime, localDay } from '../lib/date';
import { WeeklyMoodChart } from '../components/WeeklyMoodChart';
import { EmotionChip, ErrorBox, PageHead, ProgressBar, Spinner } from '../components/ui';

export default function Dashboard() {
  const profile = useProfile();
  const { data, error, loading } = useAsync(async () => {
    const [detections, badges, history, ledger, face] = await Promise.all([
      api.getDetections(7), api.getMyBadges(), api.getHistory(5), api.getLedger(50),
      profile.role === 'guest' ? Promise.resolve({ enrolled: true, updated_at: null }) : api.getFaceStatus(),
    ]);
    return { detections, badges, history, ledger, face };
  }, [profile.xp]);

  const lp = levelProgress(profile.xp);
  const today = localDay();
  const xpToday = data?.ledger.filter((l) => localDay(l.created_at) === today).reduce((s, l) => s + l.amount, 0) ?? 0;
  const pending = data?.history.find((h) => !h.completed_at);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="page">
      <PageHead
        eyebrow={greet}
        title={`Hola, ${profile.display_name || profile.username}`}
        subtitle={profile.streak > 0 ? `Sigue así: llevas ${profile.streak} día${profile.streak === 1 ? '' : 's'} cuidándote.` : '¿Cómo te sientes hoy? Hagamos un chequeo rápido.'}
        actions={<Link to="/detectar" className="btn btn-primary">📷 Detectar mi emoción</Link>}
      />
      <ErrorBox error={error} />

      <div className="split-2-1">
        <div className="stack">
          <div className="card">
            <div className="spread" style={{ marginBottom: 10 }}>
              <div>
                <div className="eyebrow" style={{ color: 'var(--purple-soft)' }}>Nivel {lp.level}</div>
                <h2 className="mb0">{LEVEL_NAMES[lp.level - 1]}</h2>
              </div>
              <div className="muted small">{lp.next ? `${lp.toNext} XP para nivel ${lp.level + 1}` : 'Nivel máximo'}</div>
            </div>
            <ProgressBar value={lp.ratio} label="Progreso de nivel" />
            <div className="spread small mt">
              <span className="muted">XP de hoy: <strong style={{ color: 'var(--text)' }}>{xpToday}</strong> / {DAILY_XP_CAP}</span>
              <Link to="/perfil">Ver logros →</Link>
            </div>
          </div>

          <div className="stats-row">
            <div className="card stat"><div className="value" style={{ color: 'var(--red)' }}>{profile.streak}</div><div className="label">🔥 Días de racha</div></div>
            <div className="card stat"><div className="value" style={{ color: 'var(--cyan)' }}>{profile.xp.toLocaleString('es-MX')}</div><div className="label">⚡ XP total</div></div>
            <div className="card stat"><div className="value" style={{ color: 'var(--yellow)' }}>{data?.badges.length ?? '—'}</div><div className="label">🏅 Logros</div></div>
          </div>

          <div className="card">
            <div className="eyebrow">Ánimo esta semana</div>
            {loading && !data ? <Spinner /> : <WeeklyMoodChart detections={data?.detections ?? []} />}
          </div>
        </div>

        <div className="stack">
          {pending && (
            <div className="card card-accent" style={{ '--accent': ACTIVITY_BY_KEY[pending.activity].color } as CSSProperties}>
              <div className="eyebrow">Pendiente para ti</div>
              <h3>{ACTIVITY_BY_KEY[pending.activity].icon} {ACTIVITY_BY_KEY[pending.activity].name}</h3>
              <p className="small muted">Recomendada {fmtDateTime(pending.assigned_at)}</p>
              {pending.emotion && <p><EmotionChip emotion={pending.emotion} confidence={pending.confidence} /></p>}
              <Link to={`/actividad/${pending.assignment_id}?auto=1`} className="btn btn-cyan btn-sm">Empezar · +{ACTIVITY_BY_KEY[pending.activity].base_xp} XP</Link>
            </div>
          )}
          <div className="card">
            <div className="eyebrow">Actividad reciente</div>
            {!data ? <Spinner /> : data.history.length === 0 ? (
              <p className="muted small">Todavía no tienes actividades. Empieza con una detección.</p>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {data.history.map((h) => (
                  <div key={h.assignment_id} className="spread small">
                    <span>{ACTIVITY_BY_KEY[h.activity].icon} {ACTIVITY_BY_KEY[h.activity].name}</span>
                    <span className={h.completed_at ? '' : 'faint'}>{h.completed_at ? '✓ Hecha' : 'Pendiente'}</span>
                  </div>
                ))}
                <Link to="/historial" className="small">Ver historial completo →</Link>
              </div>
            )}
          </div>
          {data && !data.face.enrolled && (
            <div className="card card-accent" style={{ '--accent': 'var(--cyan)' } as CSSProperties}>
              <div className="eyebrow">Nuevo</div>
              <h3>🙂 Entra con tu rostro</h3>
              <p className="small muted">Registra tu rostro y la próxima vez solo tendrás que mirar a la cámara.</p>
              <Link to="/perfil#rostro" className="btn btn-ghost btn-sm">Registrar mi rostro</Link>
            </div>
          )}
          <div className="card">
            <div className="eyebrow">Atajos</div>
            <div className="stack" style={{ gap: 8 }}>
              <Link to="/actividades" className="btn btn-ghost btn-sm">✨ Elegir actividad libre</Link>
              <Link to="/ranking" className="btn btn-ghost btn-sm">🏆 Ver ranking</Link>
              <Link to="/mentoria" className="btn btn-ghost btn-sm">🤝 Hablar con un mentor</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
