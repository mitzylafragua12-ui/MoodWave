import { useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { ACTIVITY_BY_KEY, EMOTION_BY_KEY } from '../lib/catalog';
import { ErrorBox, PageHead, ProgressBar, Spinner } from '../components/ui';

export default function Analytics() {
  const [days, setDays] = useState(30);
  const { data, error, loading } = useAsync(() => api.getAnalytics(days), [days]);
  const maxEmo = Math.max(1, ...(data?.emotions.map((e) => e.count) ?? [1]));
  const maxDay = Math.max(1, ...(data?.daily.map((d) => d.detections) ?? [1]));

  return (
    <div className="page">
      <PageHead eyebrow="Analítica" title="Dashboard analítico" color="var(--cyan)"
        subtitle="Datos agregados y anónimos de toda la plataforma."
        actions={[7, 30, 90].map((d) => (
          <button key={d} className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setDays(d)}>{d} días</button>
        ))} />
      <ErrorBox error={error} />
      {loading || !data ? <Spinner /> : (
        <div className="stack">
          <div className="grid grid-4">
            <div className="card stat"><div className="value">{data.total_users}</div><div className="label">Usuarios totales</div></div>
            <div className="card stat"><div className="value" style={{ color: 'var(--cyan)' }}>{data.active_users}</div><div className="label">Usuarios activos</div></div>
            <div className="card stat"><div className="value" style={{ color: 'var(--purple-soft)' }}>{data.detections}</div><div className="label">Detecciones</div></div>
            <div className="card stat"><div className="value" style={{ color: 'var(--yellow)' }}>{data.xp_awarded.toLocaleString('es-MX')}</div><div className="label">XP otorgado</div></div>
          </div>
          <div className="card">
            <h3>Detecciones por día</h3>
            <div className="spark" role="img" aria-label="Detecciones por día">
              {data.daily.map((d) => <span key={d.day} title={`${d.day}: ${d.detections}`} style={{ height: `${(d.detections / maxDay) * 100}%` }} />)}
            </div>
            <div className="spread small faint mt"><span>{data.daily[0]?.day}</span><span>{data.daily.at(-1)?.day}</span></div>
          </div>
          <div className="grid grid-2">
            <div className="card">
              <h3>Distribución emocional</h3>
              {data.emotions.map((e) => (
                <div key={e.key} className="hbar-row">
                  <span className="small">{EMOTION_BY_KEY[e.key].emoji} {EMOTION_BY_KEY[e.key].label}</span>
                  <ProgressBar value={e.count / maxEmo} color={EMOTION_BY_KEY[e.key].color} label={EMOTION_BY_KEY[e.key].label} />
                  <span className="small faint">{e.count}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <h3>Recomendadas vs. completadas</h3>
              <p className="small muted">Tasa de finalización por actividad ({data.completions} completadas).</p>
              {data.activities.map((a) => {
                const rate = a.assigned ? a.completed / a.assigned : 0;
                return (
                  <div key={a.key} style={{ marginBottom: 12 }}>
                    <div className="spread small"><span>{ACTIVITY_BY_KEY[a.key].icon} {ACTIVITY_BY_KEY[a.key].name}</span>
                      <span className="faint">{a.completed}/{a.assigned} · {Math.round(rate * 100)}%</span></div>
                    <ProgressBar value={rate} color={ACTIVITY_BY_KEY[a.key].color} label={ACTIVITY_BY_KEY[a.key].name} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
