import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { errMsg, useToast } from '../context/ToastContext';
import { ACTIVITY_BY_KEY, EMOTION_BY_KEY } from '../lib/catalog';
import { fmtDateTime, fmtDuration } from '../lib/date';
import type { LedgerEntry } from '../lib/types';
import { EmotionChip, ErrorBox, PageHead, Spinner } from '../components/ui';
import { t } from '../i18n';

const REASONS: Record<string, string> = { recommended: 'Recomendada', alternative: 'Alternativa', free_choice: 'Libre' };
const XP_REASONS: Record<LedgerEntry['reason'], string> = { activity: 'Actividad', daily_checkin: 'Check-in diario', badge: 'Logro', admin_adjustment: 'Ajuste' };

export default function History() {
  const [tab, setTab] = useState<'sessions' | 'journal' | 'xp'>('sessions');
  return (
    <div className="page">
      <PageHead eyebrow={t('Historial')} title={t('Tu recorrido emocional')}
        subtitle={t('Cada paso queda registrado por separado: detección → recomendación → actividad → XP.')} />
      <div className="tabs" role="tablist">
        {([['sessions', 'Sesiones'], ['journal', 'Diario'], ['xp', 'Libro de XP']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{t(l)}</button>
        ))}
      </div>
      {tab === 'sessions' && <Sessions />}
      {tab === 'journal' && <JournalList />}
      {tab === 'xp' && <Ledger />}
    </div>
  );
}

function Sessions() {
  const { data, error, loading } = useAsync(() => api.getHistory(100), []);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  if (!data?.length) return <div className="card empty">{t('Aún no hay sesiones.')} <Link to="/detectar">{t('Haz tu primera detección')}</Link>.</div>;
  const done = data.filter((d) => d.completed_at).length;
  return (
    <div className="card">
      <p className="muted small">{done} {t('de')} {data.length} {t('actividades asignadas fueron completadas (')}{Math.round((done / data.length) * 100)}%).</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>{t('Fecha')}</th><th>{t('Emoción detectada')}</th><th>{t('Actividad')}</th><th>{t('Origen')}</th><th>{t('Estado')}</th></tr></thead>
          <tbody>
            {data.map((h) => (
              <tr key={h.assignment_id}>
                <td className="small">{fmtDateTime(h.assigned_at)}</td>
                <td><EmotionChip emotion={h.emotion} confidence={h.confidence} /></td>
                <td>{ACTIVITY_BY_KEY[h.activity].icon} {ACTIVITY_BY_KEY[h.activity].name}</td>
                <td className="small muted">{t(REASONS[h.reason])}</td>
                <td className="small">
                  {h.completed_at
                    ? <span style={{ color: 'var(--green)' }}>✓ {h.duration_seconds ? fmtDuration(h.duration_seconds) : t('Hecha')}</span>
                    : <Link to={`/actividad/${h.assignment_id}?auto=1`}>{t('Pendiente · hacer')}</Link>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JournalList() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.getJournal(), []);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  if (!data?.length) return <div className="card empty">{t('Tu diario está vacío. Completa una actividad de journaling para escribir tu primera entrada.')}</div>;
  async function remove(id: string) {
    if (!confirm(t('¿Eliminar esta entrada del diario? No se puede deshacer.'))) return;
    try { await api.deleteJournal(id); reload(); } catch (e) { toast(errMsg(e), 'error'); }
  }
  return (
    <div className="stack">
      {data.map((j) => (
        <article key={j.id} className="card">
          <div className="journal-entry" style={{ '--c': j.emotion ? EMOTION_BY_KEY[j.emotion].color : undefined } as CSSProperties}>
            <div className="spread">
              <span className="small faint">{fmtDateTime(j.created_at)}</span>
              <div className="row"><EmotionChip emotion={j.emotion} /><button className="btn btn-ghost btn-sm" onClick={() => remove(j.id)}>{t('Eliminar')}</button></div>
            </div>
            {j.prompt && <h3 className="mt">{t(j.prompt)}</h3>}
            <p className="content mb0">{j.content}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function Ledger() {
  const { data, error, loading } = useAsync(() => api.getLedger(200), []);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} />;
  if (!data?.length) return <div className="card empty">{t('Aún no has ganado XP.')}</div>;
  return (
    <div className="card">
      <p className="muted small">{t('Libro mayor de solo inserción: así sabes de dónde vino cada punto de XP.')}</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>{t('Fecha')}</th><th>{t('Concepto')}</th><th>{t('Detalle')}</th><th style={{ textAlign: 'right' }}>XP</th></tr></thead>
          <tbody>
            {data.map((l) => (
              <tr key={l.id}>
                <td className="small">{fmtDateTime(l.created_at)}</td>
                <td>{t(XP_REASONS[l.reason])}</td>
                <td className="small muted">{l.note && t(l.note)}</td>
                <td style={{ textAlign: 'right', color: 'var(--cyan)', fontWeight: 700 }}>+{l.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
