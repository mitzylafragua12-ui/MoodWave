import { useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useProfile } from '../context/AuthContext';
import { errMsg, useToast } from '../context/ToastContext';
import { LEVEL_NAMES } from '../lib/gamification';
import type { LeaderRow } from '../lib/types';
import { ErrorBox, Modal, PageHead, Spinner } from '../components/ui';
import { t } from '../i18n';

export default function Leaderboard() {
  const me = useProfile();
  const toast = useToast();
  const { data, error, loading } = useAsync(() => api.getLeaderboard(), []);
  const [reporting, setReporting] = useState<LeaderRow | null>(null);
  const [reason, setReason] = useState('');

  async function sendReport() {
    if (!reporting) return;
    try {
      await api.createReport({ reported_user_id: reporting.user_id, target_type: 'user', reason });
      toast(t('Reporte enviado. Un analista lo revisará.'));
      setReporting(null); setReason('');
    } catch (e) { toast(errMsg(e), 'error'); }
  }

  return (
    <div className="page">
      <PageHead eyebrow={t('Ranking')} title={t('Leaderboard')} color="var(--yellow)" subtitle={t('Los usuarios más constantes en su autocuidado.')} />
      <ErrorBox error={error} />
      {loading ? <Spinner /> : (
        <div className="card" style={{ maxWidth: 820 }}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>{t('Usuario')}</th><th>{t('Nivel')}</th><th>{t('Racha')}</th><th style={{ textAlign: 'right' }}>XP</th><th /></tr></thead>
              <tbody>
                {data?.map((r, i) => (
                  <tr key={r.user_id} style={r.user_id === me.id ? { background: 'var(--row-me)' } : undefined}>
                    <td><span className={`rank-num rank-${i + 1}`}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span></td>
                    <td><strong>{r.display_name || r.username}</strong> <span className="small faint">@{r.username}</span>{r.user_id === me.id && <span className="small" style={{ color: 'var(--purple-soft)' }}> {t('(tú)')}</span>}</td>
                    <td className="small">{r.level} · <span className="muted">{LEVEL_NAMES[r.level - 1]}</span></td>
                    <td className="small">🔥 {r.streak}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--cyan)' }}>{r.xp.toLocaleString('es-MX')}</td>
                    <td>{r.user_id !== me.id && me.role !== 'guest' && <button className="btn btn-ghost btn-sm" title={t('Reportar usuario')} onClick={() => setReporting(r)}>⚑</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {reporting && (
        <Modal left onClose={() => setReporting(null)}>
          <h2>{t('Reportar a @')}{reporting.username}</h2>
          <p className="muted small">{t('Cuéntanos por qué. Un analista revisará el caso.')}</p>
          <textarea className="input" style={{ minHeight: 100 }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('Motivo del reporte')} />
          <div className="row mt" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setReporting(null)}>{t('Cancelar')}</button>
            <button className="btn btn-danger" disabled={reason.trim().length < 3} onClick={sendReport}>{t('Enviar reporte')}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
