import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useProfile } from '../context/AuthContext';
import { errMsg, useToast } from '../context/ToastContext';
import { ACTIVITIES, ROLES, ROLE_PERMS, can, canSuspend, isAdminRole, type Perm } from '../lib/catalog';
import { fmtDate } from '../lib/date';
import type { Badge, BadgeRule, RoleKey } from '../lib/types';
import { ErrorBox, Modal, PageHead, Spinner } from '../components/ui';

const RULES: Record<BadgeRule, string> = {
  detections: 'Nº de detecciones', completions: 'Nº de actividades completadas', activity: 'Nº de veces una actividad',
  streak: 'Días de racha', level: 'Nivel alcanzado', distinct_emotions: 'Emociones distintas', distinct_activities: 'Actividades distintas',
};
const EMPTY: Omit<Badge, 'id'> & { id?: number } = { key: '', name: '', description: '', icon: '🏅', xp_reward: 10, rule_type: 'completions', rule_activity_id: null, threshold: 1 };

export default function Admin() {
  const me = useProfile();
  const tabs = ([['users', 'Usuarios, roles y orientadores', 'manage_users'], ['badges', 'Badges', 'manage_badges'], ['roles', 'Qué ve cada rol', null]] as const)
    .filter(([, , perm]) => !perm || can(me.role, perm));
  const [tab, setTab] = useState<'users' | 'badges' | 'roles'>(tabs[0][0]);
  return (
    <div className="page">
      <PageHead eyebrow="Administración" title="Gestión del sistema" color="var(--red)" />
      <div className="tabs" role="tablist">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'users' && <Users />}
      {tab === 'badges' && <Badges />}
      {tab === 'roles' && <RolesInfo />}
    </div>
  );
}

function Users() {
  const me = useProfile();
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.listUsers(), []);
  const [q, setQ] = useState('');
  const isSuper = can(me.role, 'manage_admins');
  const canEdit = (r: RoleKey) => isSuper || !isAdminRole(r);
  const assignable = ROLES.filter((r) => isSuper || !isAdminRole(r.key));
  const mentors = data?.filter((u) => can(u.role_key, 'mentor') && !u.suspended) ?? [];
  async function changeMentor(id: string, mentorId: string) {
    try { await api.setMentor(id, mentorId || null); toast(mentorId ? 'Orientador asignado' : 'Orientador retirado'); reload(); } catch (e) { toast(errMsg(e), 'error'); }
  }

  async function change(id: string, role: RoleKey) {
    try { await api.setRole(id, role); toast('Rol actualizado'); reload(); } catch (e) { toast(errMsg(e), 'error'); }
  }
  async function removeFace(id: string, username: string) {
    if (!confirm(`¿Borrar la plantilla facial de @${username}? Tendrá que entrar con contraseña.`)) return;
    try { await api.adminDeleteFace(id); toast('Plantilla facial borrada'); reload(); } catch (e) { toast(errMsg(e), 'error'); }
  }
  async function suspend(id: string, s: boolean) {
    try { await api.setSuspended(id, s); toast(s ? 'Cuenta suspendida' : 'Cuenta reactivada'); reload(); } catch (e) { toast(errMsg(e), 'error'); }
  }

  if (loading) return <Spinner />;
  return (
    <div className="card">
      <ErrorBox error={error} />
      <div className="spread">
        <p className="muted small mb0">{data?.length} usuarios registrados. {!isSuper && 'Solo un superadmin puede gestionar administradores.'}</p>
        <input className="input" style={{ maxWidth: 240 }} placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar usuario" />
      </div>
      <div className="table-wrap mt"><table>
        <thead><tr><th>Usuario</th><th>Rol</th><th>Orientador</th><th>Nivel / XP</th><th>Alta</th><th>Estado</th></tr></thead>
        <tbody>{data?.filter((u) => u.username.includes(q.toLowerCase()) || u.display_name.toLowerCase().includes(q.toLowerCase())).map((u) => (
          <tr key={u.id}>
            <td>
              <strong>@{u.username}</strong>{u.id === me.id && <span className="small faint"> (tú)</span>}
              {u.has_face && (
                <div className="row small" style={{ gap: 6, marginTop: 2 }}>
                  <span className="faint">🙂 rostro registrado</span>
                  <button className="icon-btn small" style={{ fontSize: '.8rem', color: 'var(--red)', padding: 0 }} onClick={() => removeFace(u.id, u.username)}>borrar</button>
                </div>
              )}
            </td>
            <td>
              <select className="input" style={{ padding: '6px 10px', minWidth: 150 }} value={u.role_key} aria-label={`Rol de ${u.username}`}
                disabled={u.id === me.id || !canEdit(u.role_key)} onChange={(e) => change(u.id, e.target.value as RoleKey)}>
                {(canEdit(u.role_key) ? assignable : ROLES).map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
              </select>
            </td>
            <td>
              <select className="input" style={{ padding: '6px 10px', minWidth: 140 }} value={u.mentor_id ?? ''} aria-label={`Orientador de ${u.username}`}
                onChange={(e) => changeMentor(u.id, e.target.value)}>
                <option value="">Sin orientador</option>
                {mentors.filter((m) => m.id !== u.id).map((m) => <option key={m.id} value={m.id}>@{m.username}</option>)}
              </select>
            </td>
            <td className="small">{u.level} · {u.xp} XP<div className="faint">🔥 {u.streak}</div></td>
            <td className="small faint">{fmtDate(u.created_at)}</td>
            <td>{u.id !== me.id && canSuspend(me.role, u.role_key) ? (
              <button className={`btn btn-sm ${u.suspended ? 'btn-ghost' : 'btn-danger'}`} onClick={() => suspend(u.id, !u.suspended)}>{u.suspended ? 'Reactivar' : 'Suspender'}</button>
            ) : <span className="small faint">{u.suspended ? 'Suspendido' : 'Activo'}</span>}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}

function Badges() {
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.getBadges(), []);
  const [edit, setEdit] = useState<typeof EMPTY | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    if (!/^[a-z0-9_]{2,40}$/.test(edit.key)) return setErr('Clave: minúsculas, números o _');
    if (!edit.name.trim() || edit.threshold < 1) return setErr('Nombre y umbral (≥1) son obligatorios');
    if (edit.rule_type === 'activity' && !edit.rule_activity_id) return setErr('Elige la actividad');
    try {
      await api.saveBadge({ ...edit, rule_activity_id: edit.rule_type === 'activity' ? edit.rule_activity_id : null });
      toast('Badge guardado'); setEdit(null); setErr(null); reload();
    } catch (e2) { setErr(errMsg(e2)); }
  }
  async function remove(b: Badge) {
    if (!confirm(`¿Eliminar el badge "${b.name}"? Se quitará también a quienes lo obtuvieron.`)) return;
    try { await api.deleteBadge(b.id); toast('Badge eliminado'); reload(); } catch (e) { toast(errMsg(e), 'error'); }
  }

  if (loading) return <Spinner />;
  return (
    <div className="card">
      <div className="spread"><p className="muted small mb0">Los badges se evalúan automáticamente al registrar detecciones y completar actividades.</p>
        <button className="btn btn-primary btn-sm" onClick={() => { setEdit({ ...EMPTY }); setErr(null); }}>+ Nuevo badge</button></div>
      <div className="table-wrap mt"><table>
        <thead><tr><th /><th>Nombre</th><th>Regla</th><th>XP</th><th /></tr></thead>
        <tbody>{data?.map((b) => (
          <tr key={b.id}>
            <td style={{ fontSize: '1.4rem' }}>{b.icon}</td>
            <td><strong>{b.name}</strong><div className="small faint">{b.description}</div></td>
            <td className="small">{RULES[b.rule_type]}{b.rule_activity_id ? ` (${ACTIVITIES.find((a) => a.id === b.rule_activity_id)?.name})` : ''} ≥ {b.threshold}</td>
            <td className="small">{b.xp_reward}</td>
            <td><div className="row" style={{ flexWrap: 'nowrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEdit({ ...b }); setErr(null); }}>Editar</button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(b)}>Eliminar</button></div></td>
          </tr>
        ))}</tbody>
      </table></div>

      {edit && (
        <Modal left onClose={() => setEdit(null)}>
          <form onSubmit={save}>
            <h2>{edit.id ? 'Editar badge' : 'Nuevo badge'}</h2>
            <div className="grid" style={{ gridTemplateColumns: '80px 1fr' }}>
              <div className="field"><label htmlFor="bi">Icono</label><input id="bi" className="input" value={edit.icon} maxLength={4} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} /></div>
              <div className="field"><label htmlFor="bn">Nombre</label><input id="bn" className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            </div>
            <div className="field"><label htmlFor="bk">Clave</label><input id="bk" className="input" value={edit.key} disabled={!!edit.id} onChange={(e) => setEdit({ ...edit, key: e.target.value })} /></div>
            <div className="field"><label htmlFor="bd">Descripción</label><input id="bd" className="input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
            <div className="field"><label htmlFor="br">Regla</label>
              <select id="br" className="input" value={edit.rule_type} onChange={(e) => setEdit({ ...edit, rule_type: e.target.value as BadgeRule })}>
                {Object.entries(RULES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select></div>
            {edit.rule_type === 'activity' && (
              <div className="field"><label htmlFor="ba">Actividad</label>
                <select id="ba" className="input" value={edit.rule_activity_id ?? ''} onChange={(e) => setEdit({ ...edit, rule_activity_id: Number(e.target.value) || null })}>
                  <option value="">Elige…</option>{ACTIVITIES.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select></div>
            )}
            <div className="grid grid-2">
              <div className="field"><label htmlFor="bt">Umbral</label><input id="bt" type="number" min={1} className="input" value={edit.threshold} onChange={(e) => setEdit({ ...edit, threshold: Number(e.target.value) })} /></div>
              <div className="field"><label htmlFor="bx">XP de recompensa</label><input id="bx" type="number" min={0} className="input" value={edit.xp_reward} onChange={(e) => setEdit({ ...edit, xp_reward: Number(e.target.value) })} /></div>
            </div>
            <ErrorBox error={err} />
            <div className="row mt" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

const PERM_LABEL: Record<Perm, string> = {
  curate: 'Contenido', moderate: 'Reportes', mentor: 'Mis acompañados', analytics: 'Analítica',
  manage_users: 'Usuarios y orientadores', manage_badges: 'Badges', manage_admins: 'Gestionar administradores',
};

function RolesInfo() {
  return (
    <div className="card">
      <p className="muted small">Cada rol entra a su propio panel y ve solo sus herramientas. Todos los roles pueden usar además la parte de bienestar (detectar, actividades, progreso).</p>
      <div className="table-wrap"><table>
        <thead><tr><th>Rol</th><th>Herramientas de trabajo</th><th>Descripción</th></tr></thead>
        <tbody>{ROLES.map((r) => (
          <tr key={r.key}>
            <td><strong>{r.name}</strong> <span className="faint small">({r.key})</span></td>
            <td className="small">{ROLE_PERMS[r.key].length ? ROLE_PERMS[r.key].map((p) => PERM_LABEL[p]).join(' · ') : <span className="faint">Solo bienestar</span>}</td>
            <td className="small muted">{r.description}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}
