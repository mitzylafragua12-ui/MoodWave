import { Link } from 'react-router-dom';
import type { CompletionResult } from '../lib/types';
import { DAILY_XP_CAP, LEVEL_NAMES } from '../lib/gamification';
import { Modal } from './ui';
import { t } from '../i18n';
import { badgeDescription, badgeName } from '../lib/catalog';

export function RewardModal({ result, onClose }: { result: CompletionResult; onClose: () => void }) {
  const badgeXp = result.new_badges.reduce((s, b) => s + b.xp_reward, 0);
  return (
    <Modal>
      <div className="eyebrow">{t('¡Actividad completada!')}</div>
      <div className="xp-burst">+{result.xp_granted} XP</div>
      {result.capped && (
        <p className="warn small mt">
          {t('Alcanzaste el límite diario de')} {DAILY_XP_CAP} {t('XP. Tu actividad quedó registrada; mañana podrás seguir sumando.')}
        </p>
      )}
      {result.leveled_up && (
        <p className="mt"><strong style={{ color: 'var(--purple-soft)' }}>{t('¡Subiste a nivel')} {result.level}!</strong> — {LEVEL_NAMES[result.level - 1]}</p>
      )}
      <p className="muted">{t(result.streak === 1 ? '🔥 Racha: {n} día' : '🔥 Racha: {n} días', { n: result.streak })} · {t('Total: {xp} XP', { xp: result.xp_total })}</p>
      {result.new_badges.length > 0 && (
        <div className="mt">
          <h3>{t('Nuevos logros')}</h3>
          <div className="row" style={{ justifyContent: 'center' }}>
            {result.new_badges.map((b) => (
              <span key={b.id} className="chip" title={badgeDescription(b)}>{b.icon} {badgeName(b)}</span>
            ))}
          </div>
          {badgeXp > 0 && <p className="small faint mt">{t('Los logros otorgan XP extra (sujeto al límite diario).')}</p>}
        </div>
      )}
      <div className="row mt" style={{ justifyContent: 'center' }}>
        <Link to="/" className="btn btn-primary" onClick={onClose}>{t('Ir al inicio')}</Link>
        <Link to="/detectar" className="btn btn-ghost" onClick={onClose}>{t('Nueva detección')}</Link>
      </div>
    </Modal>
  );
}
