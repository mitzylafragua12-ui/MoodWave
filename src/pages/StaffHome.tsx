import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../context/AuthContext';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { ACTIVITY_BY_KEY, EMOTIONS, RECOMMENDATIONS, ROLES, ROLE_BY_KEY, can, rolePanelLabel } from '../lib/catalog';
import { GAMES_FOR_EMOTION } from './activities/games';
import { LEVEL_NAMES, levelProgress } from '../lib/gamification';
import { fmtDateTime } from '../lib/date';
import { EmotionChip, ErrorBox, PageHead, ProgressBar, RoleChip, Spinner } from '../components/ui';
import { t } from '../i18n';

/** Inicio de los roles de trabajo: sus herramientas primero y, aparte, su propio bienestar. */
export default function StaffHome() {
  const me = useProfile();
  const role = ROLE_BY_KEY[me.role];
  return (
    <div className="page">
      <PageHead eyebrow={rolePanelLabel(me.role)} title={t('Hola, {name}', { name: me.display_name || me.username })}
        subtitle={role.description} actions={<RoleChip role={me.role} />} />
      <div className="split-2-1">
        <div className="stack">
          {can(me.role, 'manage_users') && <AdminWidget />}
          {can(me.role, 'mentor') && <MentorWidget />}
          {can(me.role, 'moderate') && <ModeratorWidget />}
          {can(me.role, 'analytics') && <AnalystWidget />}
          {can(me.role, 'curate') && <CuratorWidget />}
        </div>
        <WellnessCard />
      </div>
    </div>
  );
}

function Widget({ title, icon, to, cta, color, children }: { title: string; icon: string; to: string; cta: string; color: string; children: ReactNode }) {
  return (
    <section className="card card-accent" style={{ '--accent': color } as CSSProperties}>
      <div className="spread" style={{ marginBottom: 12 }}>
        <h2 className="mb0">{icon} {title}</h2>
        <Link to={to} className="btn btn-ghost btn-sm">{cta} →</Link>
      </div>
      {children}
    </section>
  );
}

const Stat = ({ value, label, color }: { value: ReactNode; label: string; color?: string }) => (
  <div className="card stat tight" style={{ background: 'var(--surface-2)' }}>
    <div className="value" style={{ color, fontSize: '1.6rem' }}>{value}</div><div className="label">{label}</div>
  </div>
);

function WellnessCard() {
  const me = useProfile();
  const lp = levelProgress(me.xp);
  return (
    <aside className="card">
      <div className="eyebrow">{t('Mi bienestar')}</div>
      <h3>{t('Nivel')} {lp.level} · {LEVEL_NAMES[lp.level - 1]}</h3>
      <ProgressBar value={lp.ratio} label={t('Progreso de nivel')} />
      <div className="spread small mt"><span>{t(me.streak === 1 ? '🔥 {n} día' : '🔥 {n} días', { n: me.streak })}</span><span>⚡ {me.xp} XP</span></div>
      <p className="small muted mt">{t('También puedes cuidar tu propio bienestar: detecta cómo te sientes y haz una actividad.')}</p>
      <div className="stack" style={{ gap: 8 }}>
        <Link to="/detectar" className="btn btn-primary btn-sm">{t('📷 Detectar mi emoción')}</Link>
        <Link to="/bienestar" className="btn btn-ghost btn-sm">{t('🌊 Ver mi progreso')}</Link>
      </div>
    </aside>
  );
}

function AdminWidget() {
  const { data, error } = useAsync(() => api.listUsers(), []);
  const listeners = data?.filter((u) => u.role_key === 'listener') ?? [];
  return (
    <Widget title={t('Usuarios y roles')} icon="⚙️" to="/admin" cta={t('Administrar')} color="var(--red)">
      <ErrorBox error={error} />
      {!data ? <Spinner /> : (
        <>
          <div className="stats-row">
            <Stat value={data.length} label={t('Cuentas')} />
            <Stat value={listeners.filter((u) => !u.mentor_id).length} label={t('Usuarios sin orientador')} color="var(--yellow)" />
            <Stat value={data.filter((u) => u.suspended).length} label={t('Suspendidas')} color="var(--red)" />
          </div>
          <div className="row mt" style={{ gap: 6 }}>
            {ROLES.map((r) => {
              const n = data.filter((u) => u.role_key === r.key).length;
              return n ? <span key={r.key} className="chip">{r.name}: {n}</span> : null;
            })}
          </div>
        </>
      )}
    </Widget>
  );
}

function MentorWidget() {
  const mentees = useAsync(() => api.listMentees(), []);
  const sessions = useAsync(() => api.listMentorSessions(), []);
  const me = useProfile();
  const open = sessions.data?.filter((s) => s.status === 'requested' && s.mentee_id !== me.id).length ?? 0;
  const active = sessions.data?.filter((s) => s.status === 'active' && s.mentor_id === me.id).length ?? 0;
  return (
    <Widget title={t('Mis acompañados')} icon="🧑‍🤝‍🧑" to="/acompanados" cta={t('Ver todos')} color="var(--purple-soft)">
      <ErrorBox error={mentees.error || sessions.error} />
      {!mentees.data ? <Spinner /> : (
        <>
          <div className="stats-row">
            <Stat value={mentees.data.length} label={t('Personas asignadas')} />
            <Stat value={open} label={t('Solicitudes abiertas')} color="var(--yellow)" />
            <Stat value={active} label={t('Sesiones en curso')} color="var(--cyan)" />
          </div>
          <div className="stack mt" style={{ gap: 8 }}>
            {mentees.data.slice(0, 5).map((m) => (
              <Link key={m.user_id} to={`/acompanados/${m.user_id}`} className="spread small" style={{ color: 'var(--text)' }}>
                <span><strong>@{m.username}</strong></span>
                {m.consent ? <EmotionChip emotion={m.last_emotion} /> : <span className="faint">{t('🔒 Sin permiso')}</span>}
              </Link>
            ))}
            {mentees.data.length === 0 && <p className="small muted mb0">{t('Aún no tienes personas asignadas. Toma una solicitud o pide al administrador que te asigne.')}</p>}
          </div>
        </>
      )}
    </Widget>
  );
}

function ModeratorWidget() {
  const reports = useAsync(() => api.listReports(), []);
  const open = reports.data?.filter((r) => r.status === 'open') ?? [];
  return (
    <Widget title={t('Reportes')} icon="🛡️" to="/moderacion" cta={t('Revisar')} color="var(--yellow)">
      <ErrorBox error={reports.error} />
      {!reports.data ? <Spinner /> : open.length === 0 ? <p className="muted mb0">{t('✓ No hay reportes pendientes.')}</p> : (
        <div className="stack" style={{ gap: 10 }}>
          <p className="mb0"><strong style={{ color: 'var(--yellow)' }}>{open.length}</strong> {t('reporte(s) por revisar')}</p>
          {open.slice(0, 3).map((r) => (
            <div key={r.id} className="small">
              <strong>{r.reported_username ? `@${r.reported_username}` : t('Sesión de orientación')}</strong> <span className="faint">· {fmtDateTime(r.created_at)}</span>
              <div className="muted">{r.reason}</div>
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}

function AnalystWidget() {
  const { data, error } = useAsync(() => api.getAnalytics(7), []);
  const assigned = data?.activities.reduce((s, a) => s + a.assigned, 0) ?? 0;
  const done = data?.activities.reduce((s, a) => s + a.completed, 0) ?? 0;
  const top = data ? [...data.emotions].sort((a, b) => b.count - a.count)[0] : null;
  return (
    <Widget title={t('Analítica (7 días)')} icon="📊" to="/analitica" cta={t('Ver dashboard')} color="var(--cyan)">
      <ErrorBox error={error} />
      {!data ? <Spinner /> : (
        <div className="stats-row">
          <Stat value={data.active_users} label={t('Usuarios activos')} color="var(--cyan)" />
          <Stat value={data.detections} label={t('Detecciones')} />
          <Stat value={assigned ? `${Math.round((done / assigned) * 100)}%` : '—'} label={t('Actividades completadas')} color="var(--green)" />
        </div>
      )}
      {top && top.count > 0 && <p className="small muted mt mb0">{t('Emoción más frecuente:')} <EmotionChip emotion={top.key} /></p>}
    </Widget>
  );
}

function CuratorWidget() {
  const { data } = useAsync(() => api.getPlaylists(), []);
  return (
    <Widget title={t('Contenido por emoción')} icon="🎵" to="/curaduria" cta={t('Editar música')} color="var(--green)">
      <div className="table-wrap"><table>
        <thead><tr><th>{t('Emoción')}</th><th>{t('Actividad principal')}</th><th>{t('Juegos')}</th><th>{t('Playlist')}</th></tr></thead>
        <tbody>{EMOTIONS.map((e) => {
          const act = ACTIVITY_BY_KEY[RECOMMENDATIONS[e.key][0][0]];
          const games = GAMES_FOR_EMOTION[e.key];
          return (
            <tr key={e.key}>
              <td><EmotionChip emotion={e.key} /></td>
              <td className="small">{act.icon} {act.name}</td>
              <td className="small" title={games.map((g) => g.name).join(' · ')}>{games.map((g) => g.icon).join(' ')} <span className="muted">{t('{n} juegos', { n: games.length })}</span></td>
              <td className="small muted">{data?.find((p) => p.emotion === e.key)?.title ?? '…'}</td>
            </tr>
          );
        })}</tbody>
      </table></div>
    </Widget>
  );
}
