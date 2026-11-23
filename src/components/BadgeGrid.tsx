import type { Badge, EarnedBadge } from '../lib/types';
import { badgeProgress, type BadgeStats } from '../lib/gamification';
import { fmtDate } from '../lib/date';
import { ProgressBar } from './ui';

export function BadgeGrid({ badges, earned, stats }: { badges: Badge[]; earned: EarnedBadge[]; stats?: BadgeStats }) {
  const got = new Map(earned.map((e) => [e.badge_id, e.earned_at]));
  return (
    <div className="badge-grid">
      {badges.map((b) => {
        const when = got.get(b.id);
        const p = stats ? badgeProgress(b, stats) : null;
        return (
          <div key={b.id} className={`badge-tile${when ? '' : ' locked'}`} title={b.description}>
            <div className="icon" aria-hidden>{b.icon}</div>
            <div className="name">{b.name}</div>
            <div className="desc">{when ? `Obtenido ${fmtDate(when)}` : b.description}</div>
            {!when && p && (
              <>
                <ProgressBar value={p.ratio} color="var(--cyan)" label={`Progreso de ${b.name}`} />
                <div className="desc">{p.value}/{b.threshold}</div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
