import { useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useProfile } from '../context/AuthContext';
import { errMsg, useToast } from '../context/ToastContext';
import { roleAtLeast } from '../lib/catalog';
import { fmtDateTime } from '../lib/date';
import type { MentorSession } from '../lib/types';
import { ErrorBox, Modal, PageHead, Spinner } from '../components/ui';

const STATUS: Record<MentorSession['status'], [string, string]> = {
  requested: ['Solicitada', 'var(--yellow)'], active: ['En curso', 'var(--cyan)'],
  completed: ['Completada', 'var(--green)'], cancelled: ['Cancelada', 'var(--faint)'],
};

export default function Mentorship() {
  const me = useProfile();
  const toast = useToast();
  const isMentor = roleAtLeast(me.role, 'mentor');
  const { data, error, loading, reload } = useAsync(() => api.listMentorSessions(), []);
  const [topic, setTopic] = useState('');
  const [closing, setClosing] = useState<MentorSession | null>(null);
  const [feedback, setFeedback] = useState('');
  const [notes, setNotes] = useState('');
  const [reportFor, setReportFor] = useState<MentorSession | null>(null);
  const [reason, setReason] = useState('');

  const act = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); toast(ok); reload(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  const mine = data?.filter((s) => s.mentee_id === me.id) ?? [];
  const queue = data?.filter((s) => s.status === 'requested' && s.mentee_id !== me.id) ?? [];
  const guiding = data?.filter((s) => s.mentor_id === me.id) ?? [];

  const Badge = ({ s }: { s: MentorSession }) => <span className="chip" style={{ color: STATUS[s.status][1] }}>{STATUS[s.status][0]}</span>;

  return (
    <div className="page">
      <PageHead eyebrow="Mentoría" title="Acompañamiento" color="var(--purple-soft)"
        subtitle="Solicita una sesión con un mentor para recibir guía y retroalimentación personalizada." />
      <ErrorBox error={error} />
      <div className="notice small" style={{ marginBottom: 16 }}>
        MoodWave no sustituye la atención profesional. Si estás en crisis, llama a la Línea de la Vida: <strong>800 911 2000</strong> (México, 24 h).
      </div>
      {loading ? <Spinner /> : (
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <div className="stack">
            {me.role !== 'guest' && (
              <div className="card">
                <h2>Solicitar sesión</h2>
                <textarea className="input" style={{ minHeight: 100 }} value={topic} maxLength={500} onChange={(e) => setTopic(e.target.value)}
                  placeholder="¿Sobre qué te gustaría hablar? Ej. manejar el estrés de los exámenes" />
                <button className="btn btn-primary mt" disabled={topic.trim().length < 3 || me.suspended}
                  onClick={() => act(async () => { await api.requestMentorSession(topic); setTopic(''); }, 'Solicitud enviada')}>Enviar solicitud</button>
              </div>
            )}
            <div className="card">
              <h2>Mis sesiones</h2>
              {mine.length === 0 ? <p className="muted small">No has solicitado sesiones.</p> : mine.map((s) => (
                <div key={s.id} className="card tight mt" style={{ background: 'var(--surface-2)' }}>
                  <div className="spread"><Badge s={s} /><span className="small faint">{fmtDateTime(s.created_at)}</span></div>
                  <p className="mt mb0">{s.topic}</p>
                  {s.mentor_username && <p className="small muted mb0">Mentor: @{s.mentor_username}</p>}
                  {s.feedback && <div className="notice small mt"><strong>Retroalimentación:</strong> {s.feedback}</div>}
                  <div className="row mt">
                    {s.status === 'requested' && <button className="btn btn-ghost btn-sm" onClick={() => act(() => api.cancelMentorSession(s.id), 'Solicitud cancelada')}>Cancelar</button>}
                    {s.mentor_id && <button className="btn btn-ghost btn-sm" onClick={() => setReportFor(s)}>⚑ Reportar</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isMentor && (
            <div className="stack">
              <div className="card">
                <h2>Solicitudes abiertas</h2>
                {queue.length === 0 ? <p className="muted small">No hay solicitudes pendientes.</p> : queue.map((s) => (
                  <div key={s.id} className="card tight mt" style={{ background: 'var(--surface-2)' }}>
                    <div className="spread"><strong>@{s.mentee_username}</strong><span className="small faint">{fmtDateTime(s.created_at)}</span></div>
                    <p className="mt">{s.topic}</p>
                    <button className="btn btn-cyan btn-sm" onClick={() => act(() => api.claimMentorSession(s.id), 'Sesión asignada a ti')}>Tomar sesión</button>
                  </div>
                ))}
              </div>
              <div className="card">
                <h2>Sesiones que guío</h2>
                {guiding.length === 0 ? <p className="muted small">Aún no guías sesiones.</p> : guiding.map((s) => (
                  <div key={s.id} className="card tight mt" style={{ background: 'var(--surface-2)' }}>
                    <div className="spread"><strong>@{s.mentee_username}</strong><Badge s={s} /></div>
                    <p className="mt mb0">{s.topic}</p>
                    {s.notes && <p className="small faint mb0">Notas privadas: {s.notes}</p>}
                    {s.feedback && <p className="small muted mb0">Feedback: {s.feedback}</p>}
                    {s.status === 'active' && <button className="btn btn-primary btn-sm mt" onClick={() => { setClosing(s); setFeedback(''); setNotes(''); }}>Dar retroalimentación y cerrar</button>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {closing && (
        <Modal left onClose={() => setClosing(null)}>
          <h2>Cerrar sesión con @{closing.mentee_username}</h2>
          <div className="field"><label htmlFor="fb">Retroalimentación (visible para el usuario)</label>
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
      {reportFor && (
        <Modal left onClose={() => setReportFor(null)}>
          <h2>Reportar sesión</h2>
          <textarea className="input" style={{ minHeight: 100 }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="¿Qué ocurrió?" />
          <div className="row mt" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setReportFor(null)}>Cancelar</button>
            <button className="btn btn-danger" disabled={reason.trim().length < 3}
              onClick={() => act(async () => {
                await api.createReport({ target_type: 'mentor_session', target_id: reportFor.id, reported_user_id: reportFor.mentor_id, reason });
                setReportFor(null); setReason('');
              }, 'Reporte enviado')}>Enviar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
