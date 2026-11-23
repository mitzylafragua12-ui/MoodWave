import { Link } from 'react-router-dom';
import type { CompletionResult } from '../lib/types';
import { DAILY_XP_CAP, LEVEL_NAMES } from '../lib/gamification';
import { Modal } from './ui';

export function RewardModal({ result, onClose }: { result: CompletionResult; onClose: () => void }) {
  const badgeXp = result.new_badges.reduce((s, b) => s + b.xp_reward, 0);
  return (
    <Modal>
      <div className="eyebrow">¡Actividad completada!</div>
      <div className="xp-burst">+{result.xp_granted} XP</div>
      {result.capped && (
        <p className="warn small mt">
          Alcanzaste el límite diario de {DAILY_XP_CAP} XP. Tu actividad quedó registrada; mañana podrás seguir sumando.
        </p>
      )}
      {result.leveled_up && (
        <p className="mt"><strong style={{ color: 'var(--purple-soft)' }}>¡Subiste a nivel {result.level}!</strong> — {LEVEL_NAMES[result.level - 1]}</p>
      )}
      <p className="muted">🔥 Racha: {result.streak} día{result.streak === 1 ? '' : 's'} · Total: {result.xp_total} XP</p>
      {result.new_badges.length > 0 && (
        <div className="mt">
          <h3>Nuevos logros</h3>
          <div className="row" style={{ justifyContent: 'center' }}>
            {result.new_badges.map((b) => (
              <span key={b.id} className="chip" title={b.description}>{b.icon} {b.name}</span>
            ))}
          </div>
          {badgeXp > 0 && <p className="small faint mt">Los logros otorgan XP extra (sujeto al límite diario).</p>}
        </div>
      )}
      <div className="row mt" style={{ justifyContent: 'center' }}>
        <Link to="/" className="btn btn-primary" onClick={onClose}>Ir al inicio</Link>
        <Link to="/detectar" className="btn btn-ghost" onClick={onClose}>Nueva detección</Link>
      </div>
    </Modal>
  );
}
