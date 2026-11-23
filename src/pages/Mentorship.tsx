import { useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useProfile } from '../context/AuthContext';
import { errMsg, useToast } from '../context/ToastContext';
import { fmtDateTime } from '../lib/date';
import type { MentorSession } from '../lib/types';
import { ErrorBox, Modal, PageHead, Spinner } from '../components/ui';

export const SESSION_STATUS: Record<MentorSession['status'], [string, string]> = {
  requested: ['Solicitada', 'var(--yellow)'], active: ['En curso', 'var(--cyan)'],
  completed: ['Completada', 'var(--green)'], cancelled: ['Cancelada', 'var(--faint)'],
};
export const StatusChip = ({ s }: { s: MentorSession }) => <span className="chip" style={{ color: SESSION_STATUS[s.status][1] }}>{SESSION_STATUS[s.status][0]}</span>;

/** Mi mentoría (vista de la persona): mi mentor, permiso de privacidad y mis sesiones. */
export default function Mentorship() {
  const me = useProfile();
  const toast = useToast();
  const mine = useAsync(() => api.getMyMentorship(), []);
  const sessions = useAsync(() => api.listMentorSessions(), []);
  const [topic, setTopic] = useState('');
  const [reportFor, setReportFor] = useState<MentorSession | null>(null);
  const [reason, setReason] = useState('');

  const act = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); toast(ok); sessions.reload(); mine.reload(); } catch (e) { toast(errMsg(e), 'error'); }
  };
  const own = sessions.data?.filter((s) => s.mentee_id === me.id) ?? [];
  const m = mine.data;

  return (
    <div className="page">
      <PageHead eyebrow="Mi orientación" title="Acompañamiento" color="var(--purple-soft)"
        subtitle="Solicita una sesión con un orientador y decide si puede ver cómo te has sentido." />
      <ErrorBox error={mine.error || sessions.error} />
      <div className="notice small" style={{ marginBottom: 16 }}>
        MoodWave no sustituye la atención profesional. Si estás en crisis, llama a la Línea de la Vida: <strong>800 911 2000</strong> (México, 24 h).
      </div>
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="stack">
          <section className="card" id="privacidad">
            <h2>🔒 Privacidad</h2>
            {!m ? <Spinner /> : (
              <>
                <p className="small muted">{m.mentor_username ? <>Tu orientador es <strong>@{m.mentor_username}</strong>.</> : 'Aún no tienes orientador asignado.'} ¿Quieres que pueda ver tus emociones, actividades y progreso?</p>
                <div className={m.consent ? 'notice' : 'warn'}>
                  {m.consent
                    ? <>Ahora mismo <strong>sí</strong>: {m.mentor_username ? `@${m.mentor_username} puede` : 'tu orientador podrá'} ver tu historial emocional.</>
                    : <>Ahora mismo <strong>no</strong>: nadie más que tú ve tus emociones.</>}
                  <div className="small" style={{ marginTop: 6 }}>Tu diario nunca se comparte, decidas lo que decidas aquí.</div>
                </div>
                {m.consent_at && <p className="small faint mt mb0">Último cambio: {fmtDateTime(m.consent_at)}</p>}
                <button className={`btn btn-sm mt ${m.consent ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => act(() => api.setMentorConsent(!m.consent), m.consent ? 'Permiso retirado' : 'Permiso concedido')}>
                  {m.consent ? 'Retirar el permiso' : 'Dar permiso'}
                </button>
              </>
            )}
          </section>
          {me.role !== 'guest' && (
            <section className="card">
              <h2>Solicitar sesión</h2>
              <textarea className="input" style={{ minHeight: 100 }} value={topic} maxLength={500} onChange={(e) => setTopic(e.target.value)}
                placeholder="¿Sobre qué te gustaría hablar? Ej. manejar el estrés de los exámenes" />
              <button className="btn btn-primary mt" disabled={topic.trim().length < 3 || me.suspended}
                onClick={() => act(async () => { await api.requestMentorSession(topic); setTopic(''); }, 'Solicitud enviada')}>Enviar solicitud</button>
            </section>
          )}
        </div>
        <section className="card">
          <h2>Mis sesiones</h2>
          {sessions.loading ? <Spinner /> : own.length === 0 ? <p className="muted small">No has solicitado sesiones.</p> : own.map((s) => (
            <div key={s.id} className="card tight mt" style={{ background: 'var(--surface-2)' }}>
              <div className="spread"><StatusChip s={s} /><span className="small faint">{fmtDateTime(s.created_at)}</span></div>
              <p className="mt mb0">{s.topic}</p>
              {s.mentor_username && <p className="small muted mb0">Orientador: @{s.mentor_username}</p>}
              {s.feedback && <div className="notice small mt"><strong>Retroalimentación:</strong> {s.feedback}</div>}
              <div className="row mt">
                {s.status === 'requested' && <button className="btn btn-ghost btn-sm" onClick={() => act(() => api.cancelMentorSession(s.id), 'Solicitud cancelada')}>Cancelar</button>}
                {s.mentor_id && <button className="btn btn-ghost btn-sm" onClick={() => setReportFor(s)}>⚑ Reportar</button>}
              </div>
            </div>
          ))}
        </section>
      </div>
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
