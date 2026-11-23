import { EMOTIONS } from '../lib/catalog';
import { lastDays, localDay, weekdayShort } from '../lib/date';
import type { DetectionRow, EmotionKey } from '../lib/types';

/** Barras apiladas: emociones registradas por día en los últimos 7 días (HU-06). */
export function WeeklyMoodChart({ detections }: { detections: DetectionRow[] }) {
  const days = lastDays(7);
  const today = localDay();
  const counts = days.map((d) => {
    const c = {} as Record<EmotionKey, number>;
    for (const det of detections) if (localDay(det.created_at) === d) c[det.emotion] = (c[det.emotion] ?? 0) + 1;
    return c;
  });
  const totals = counts.map((c) => Object.values(c).reduce((s, n) => s + n, 0));
  const max = Math.max(1, ...totals);
  const used = EMOTIONS.filter((e) => counts.some((c) => c[e.key]));

  return (
    <div>
      <div className="week-chart" role="img" aria-label="Emociones registradas en los últimos 7 días">
        {days.map((d, i) => (
          <div key={d} className={`week-col${d === today ? ' today' : ''}`} title={`${totals[i]} registro(s)`}>
            <span className="small faint">{totals[i] || ''}</span>
            <div className="week-stack" style={{ height: `${(totals[i] / max) * 100}%` }}>
              {EMOTIONS.filter((e) => counts[i][e.key]).map((e) => (
                <span key={e.key} style={{ flex: counts[i][e.key], background: e.color }} />
              ))}
            </div>
            <span className="lbl">{weekdayShort(d)}</span>
          </div>
        ))}
      </div>
      {used.length > 0 ? (
        <div className="legend">
          {used.map((e) => <span key={e.key}><span className="chip-dot" style={{ background: e.color }} />{e.label}</span>)}
        </div>
      ) : <p className="muted small mt">Aún no hay registros esta semana. ¡Haz tu primera detección!</p>}
    </div>
  );
}
