import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { ACTIVITY_BY_KEY, EMOTIONS } from '../lib/catalog';
import { LEVEL_NAMES } from '../lib/gamification';
import { fmtDateTime } from '../lib/date';
import { WeeklyMoodChart } from '../components/WeeklyMoodChart';
import { EmotionChip, ErrorBox, PageHead, ProgressBar, Spinner } from '../components/ui';
import { t } from '../i18n';

/** Historial de una persona acompañada (solo con su permiso; sin diarios). */
export default function MenteeDetail() {
  const { userId = '' } = useParams();
  const { data, error, loading } = useAsync(() => api.getMentee(userId), [userId]);

  if (loading) return <div className="page"><Spinner /></div>;
  if (error || !data) return (
    <div className="page"><ErrorBox error={error ?? t('No disponible')} /><Link to="/acompanados" className="btn btn-ghost mt">{t('← Volver')}</Link></div>
  );
  const maxEmo = Math.max(1, ...EMOTIONS.map((e) => data.detections.filter((d) => d.emotion === e.key).length));
  const done = data.history.filter((h) => h.completed_at).length;

  return (
    <div className="page">
      <PageHead eyebrow={t('Persona acompañada')} title={data.display_name || `@${data.username}`} color="var(--purple-soft)"
        subtitle={<>@{data.username} {t('· compartió su historial contigo. Si retira el permiso, dejarás de verlo al instante.')}</>}
        actions={<Link to="/acompanados" className="btn btn-ghost btn-sm">{t('← Mis acompañados')}</Link>} />
      <div className="stats-row">
        <div className="card stat"><div className="value" style={{ color: 'var(--purple-soft)' }}>{data.level}</div><div className="label">{t('Nivel ·')} {LEVEL_NAMES[data.level - 1]}</div></div>
        <div className="card stat"><div className="value" style={{ color: 'var(--red)' }}>{data.streak}</div><div className="label">{t('Racha actual (mejor:')} {data.longest_streak})</div></div>
        <div className="card stat"><div className="value" style={{ color: 'var(--cyan)' }}>{data.history.length ? `${Math.round((done / data.history.length) * 100)}%` : '—'}</div><div className="label">{t('Actividades completadas')}</div></div>
      </div>
      <div className="grid grid-2 mt" style={{ alignItems: 'start' }}>
        <section className="card">
          <div className="eyebrow">{t('Ánimo esta semana')}</div>
          <WeeklyMoodChart detections={data.detections} />
        </section>
        <section className="card">
          <h3>{t('Emociones (30 días)')}</h3>
          {EMOTIONS.map((e) => {
            const n = data.detections.filter((d) => d.emotion === e.key).length;
            return (
              <div key={e.key} className="hbar-row">
                <span className="small">{e.emoji} {e.label}</span>
                <ProgressBar value={n / maxEmo} color={e.color} label={e.label} />
                <span className="small faint">{n}</span>
              </div>
            );
          })}
        </section>
      </div>
      <section className="card mt">
        <h3>{t('Actividades recientes')}</h3>
        <p className="small faint">{t('Las entradas del diario son privadas y no aparecen aquí.')}</p>
        <div className="table-wrap"><table>
          <thead><tr><th>{t('Fecha')}</th><th>{t('Emoción')}</th><th>{t('Actividad')}</th><th>{t('Estado')}</th></tr></thead>
          <tbody>{data.history.map((h) => (
            <tr key={h.assignment_id}>
              <td className="small">{fmtDateTime(h.assigned_at)}</td>
              <td><EmotionChip emotion={h.emotion} confidence={h.confidence} /></td>
              <td className="small">{ACTIVITY_BY_KEY[h.activity].icon} {ACTIVITY_BY_KEY[h.activity].name}</td>
              <td className="small">{h.completed_at ? <span style={{ color: 'var(--green)' }}>{t('✓ Hecha')}</span> : <span className="faint">{t('Pendiente')}</span>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>
    </div>
  );
}
