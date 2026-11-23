import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useProfile } from '../context/AuthContext';
import { errMsg, useToast } from '../context/ToastContext';
import { LEVEL_NAMES } from '../lib/gamification';
import { fmtDateTime } from '../lib/date';
import type { MentorSession } from '../lib/types';
import { EmotionChip, ErrorBox, Modal, PageHead, Spinner } from '../components/ui';
import { StatusChip } from './Mentorship';

/** Espacio de trabajo del mentor: personas asignadas, solicitudes abiertas y sesiones que guía. */
export default function Mentees() {
  const me = useProfile();
  const toast = useToast();
  const mentees = useAsync(() => api.listMentees(), []);
  const sessions = useAsync(() => api.listMentorSessions(), []);
  const [closing, setClosing] = useState<MentorSession | null>(null);
  const [feedback, setFeedback] = useState('');
  const [notes, setNotes] = useState('');

  const act = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); toast(ok); sessions.reload(); mentees.reload(); } catch (e) { toast(errMsg(e), 'error'); }
  };
  const queue = sessions.data?.filter((s) => s.status === 'requested' && s.mentee_id !== me.id) ?? [];
  const guiding = sessions.data?.filter((s) => s.mentor_id === me.id) ?? [];

  return (
    <div className="page">
      <PageHead eyebrow="Orientador" title="Mis acompañados" color="var(--purple-soft)"
        subtitle="Ves el historial emocional de una persona solo si ella te dio permiso. Los diarios nunca se comparten." />
      <ErrorBox error={mentees.error || sessions.error} />
      <section className="card">
        <h2>Personas asignadas</h2>
        {mentees.loading ? <Spinner /> : !mentees.data?.length ? <p className="muted small mb0">Aún no tienes personas asignadas. Cuando tomes una solicitud de sesión, esa persona queda contigo; el administrador también puede asignarte.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Persona</th><th>Permiso</th><th>Última emoción</th><th>Nivel</th><th>Racha</th><th /></tr></thead>
            <tbody>{mentees.data.map((m) => (
              <tr key={m.user_id}>
                <td><strong>@{m.username}</strong><div className="small faint">desde {fmtDateTime(m.assigned_at)}</div></td>
                <td className="small">{m.consent ? <span style={{ color: 'var(--green)' }}>✓ Compartido</span> : <span className="faint">🔒 Privado</span>}</td>
                <td>{m.consent ? <><EmotionChip emotion={m.last_emotion} />{m.last_seen && <div className="small faint">{fmtDateTime(m.last_seen)}</div>}</> : <span className="faint">—</span>}</td>
                <td className="small">{m.level ? `${m.level} · ${LEVEL_NAMES[m.level - 1]}` : '—'}</td>
                <td className="small">{m.streak != null ? `🔥 ${m.streak}` : '—'}</td>
                <td>{m.consent && <Link to={`/acompanados/${m.user_id}`} className="btn btn-ghost btn-sm">Ver historial</Link>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>

      <div className="grid grid-2 mt" style={{ alignItems: 'start' }}>
        <section className="card">
          <h2>Solicitudes abiertas</h2>
          {queue.length === 0 ? <p className="muted small mb0">No hay solicitudes pendientes.</p> : queue.map((s) => (
            <div key={s.id} className="card tight mt" style={{ background: 'var(--surface-2)' }}>
              <div className="spread"><strong>@{s.mentee_username}</strong><span className="small faint">{fmtDateTime(s.created_at)}</span></div>
              <p className="mt">{s.topic}</p>
              <button className="btn btn-cyan btn-sm" onClick={() => act(() => api.claimMentorSession(s.id), 'Sesión asignada a ti')}>Tomar sesión</button>
            </div>
          ))}
        </section>
        <section className="card">
          <h2>Sesiones que guío</h2>
          {guiding.length === 0 ? <p className="muted small mb0">Aún no guías sesiones.</p> : guiding.map((s) => (
            <div key={s.id} className="card tight mt" style={{ background: 'var(--surface-2)' }}>
              <div className="spread"><strong>@{s.mentee_username}</strong><StatusChip s={s} /></div>
              <p className="mt mb0">{s.topic}</p>
              {s.notes && <p className="small faint mb0">Notas privadas: {s.notes}</p>}
              {s.feedback && <p className="small muted mb0">Retroalimentación: {s.feedback}</p>}
              {s.status === 'active' && <button className="btn btn-primary btn-sm mt" onClick={() => { setClosing(s); setFeedback(''); setNotes(''); }}>Dar retroalimentación y cerrar</button>}
            </div>
          ))}
        </section>
      </div>

      {closing && (
        <Modal left onClose={() => setClosing(null)}>
          <h2>Cerrar sesión con @{closing.mentee_username}</h2>
          <div className="field"><label htmlFor="fb">Retroalimentación (visible para la persona)</label>
            <textarea id="fb" className="input" style={{ minHeight: 110 }} value={feedback} onChange={(e) => setFeedback(e.target.value)} /></div>
          <div className="field"><label htmlFor="nt">Notas privadas (solo tú)</label>
            <textarea id="nt" className="input" style={{ minHeight: 70 }} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setClosing(null)}>Cancelar</button>
            <button className="btn btn-primary" disabled={feedback.trim().length < 3}
              onClick={() => act(async () => { await api.completeMentorSession(closing.id, feedback, notes); setClosing(null); }, 'Sesión completada')}>Completar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
