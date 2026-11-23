import { useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useProfile } from '../context/AuthContext';
import { errMsg, useToast } from '../context/ToastContext';
import { canSuspend as allowed } from '../lib/catalog';
import type { RoleKey } from '../lib/types';
import { fmtDateTime } from '../lib/date';
import type { Report } from '../lib/types';
import { ErrorBox, Modal, PageHead, RoleChip, Spinner } from '../components/ui';

export default function Moderation() {
  const me = useProfile();
  const toast = useToast();
  const reports = useAsync(() => api.listReports(), []);
  const users = useAsync(() => api.listUsers(), []);
  const [resolving, setResolving] = useState<{ r: Report; status: 'resolved' | 'dismissed' } | null>(null);
  const [resolution, setResolution] = useState('');
  const [filter, setFilter] = useState('');

  const act = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); toast(ok); reports.reload(); users.reload(); } catch (e) { toast(errMsg(e), 'error'); }
  };
  const open = reports.data?.filter((r) => r.status === 'open').length ?? 0;
  const canSuspend = (role: RoleKey) => allowed(me.role, role);

  return (
    <div className="page">
      <PageHead eyebrow="Revisor de reportes" title="Reportes y cuentas" color="var(--red)" subtitle={`${open} reporte(s) abierto(s)`} />
      <ErrorBox error={reports.error || users.error} />
      <div className="card">
        <h2>Reportes</h2>
        {reports.loading ? <Spinner /> : !reports.data?.length ? <p className="muted">Sin reportes.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Fecha</th><th>Reportado</th><th>Por</th><th>Tipo</th><th>Motivo</th><th>Estado</th><th /></tr></thead>
            <tbody>{reports.data.map((r) => {
              const target = users.data?.find((u) => u.id === r.reported_user_id);
              return (
                <tr key={r.id}>
                  <td className="small">{fmtDateTime(r.created_at)}</td>
                  <td>{r.reported_username ? `@${r.reported_username}` : '—'}{target?.suspended && <span className="small" style={{ color: 'var(--red)' }}> (suspendido)</span>}</td>
                  <td className="small muted">@{r.reporter_username}</td>
                  <td className="small">{r.target_type === 'user' ? 'Usuario' : 'Orientación'}</td>
                  <td className="small" style={{ maxWidth: 260 }}>{r.reason}{r.resolution && <div className="faint">→ {r.resolution}</div>}</td>
                  <td className="small">{r.status === 'open' ? <span style={{ color: 'var(--yellow)' }}>Abierto</span> : r.status === 'resolved' ? 'Resuelto' : 'Descartado'}</td>
                  <td>
                    {r.status === 'open' && (
                      <div className="row" style={{ flexWrap: 'nowrap' }}>
                        {target && !target.suspended && canSuspend(target.role_key) &&
                          <button className="btn btn-danger btn-sm" onClick={() => act(() => api.setSuspended(target.id, true), `@${target.username} suspendido`)}>Suspender</button>}
                        <button className="btn btn-ghost btn-sm" onClick={() => { setResolving({ r, status: 'resolved' }); setResolution(''); }}>Resolver</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setResolving({ r, status: 'dismissed' }); setResolution(''); }}>Descartar</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </div>

      <div className="card mt">
        <div className="spread"><h2 className="mb0">Cuentas</h2>
          <input className="input" style={{ maxWidth: 240 }} placeholder="Buscar usuario…" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Buscar usuario" /></div>
        {users.loading ? <Spinner /> : (
          <div className="table-wrap mt"><table>
            <thead><tr><th>Usuario</th><th>Rol</th><th>Nivel</th><th>Estado</th><th /></tr></thead>
            <tbody>{users.data?.filter((u) => u.username.includes(filter.toLowerCase())).map((u) => (
              <tr key={u.id}>
                <td>@{u.username}</td>
                <td><RoleChip role={u.role_key} /></td>
                <td className="small">{u.level} · {u.xp} XP</td>
                <td className="small">{u.suspended ? <span style={{ color: 'var(--red)' }}>Suspendido</span> : 'Activo'}</td>
                <td>{u.id !== me.id && canSuspend(u.role_key) && (
                  <button className={`btn btn-sm ${u.suspended ? 'btn-ghost' : 'btn-danger'}`}
                    onClick={() => act(() => api.setSuspended(u.id, !u.suspended), u.suspended ? 'Cuenta reactivada' : 'Cuenta suspendida')}>
                    {u.suspended ? 'Reactivar' : 'Suspender'}
                  </button>)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>

      {resolving && (
        <Modal left onClose={() => setResolving(null)}>
          <h2>{resolving.status === 'resolved' ? 'Resolver reporte' : 'Descartar reporte'}</h2>
          <p className="muted small">{resolving.r.reason}</p>
          <textarea className="input" style={{ minHeight: 90 }} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Nota de resolución (opcional)" />
          <div className="row mt" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setResolving(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => act(async () => { await api.resolveReport(resolving.r.id, resolving.status, resolution); setResolving(null); }, 'Reporte actualizado')}>Confirmar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
