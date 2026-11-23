import { useState, type FormEvent } from 'react';
import { asset } from '../lib/paths';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { DEMO_PASSWORD } from '../lib/api/demoApi';
import { ErrorBox } from '../components/ui';
import { FaceLoginPanel, isFaceDevice } from '../components/FaceLoginPanel';
import { errMsg } from '../context/ToastContext';

const DEMO_ACCOUNTS = [
  ['demo', 'Listener'], ['curador', 'Curador'], ['moderador', 'Moderador'], ['mentor', 'Mentor'],
  ['analista', 'Analista'], ['admin', 'Admin'], ['superadmin', 'Superadmin'],
] as const;

export function AuthHero() {
  return (
    <div className="auth-hero">
      <div className="brand"><img src={asset('icon.svg')} alt="" style={{ width: 44, height: 44 }} /><span>Mood<b>Wave</b></span></div>
      <div className="tagline">Ride your emotions</div>
    </div>
  );
}

export default function Login() {
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'face' | 'password'>(() => (isFaceDevice() ? 'face' : 'password'));

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null); setInfo(null);
    try { await fn(); nav(from, { replace: true }); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || password.length < 6) { setError('Ingresa un correo válido y una contraseña de al menos 6 caracteres.'); return; }
    run(() => api.signIn(email, password));
  };

  async function forgot() {
    if (!email.includes('@')) { setError('Escribe tu correo para enviarte el enlace de recuperación.'); return; }
    setError(null);
    try { await api.resetPassword(email); setInfo('Te enviamos un correo para restablecer tu contraseña.'); } catch (e) { setError(errMsg(e)); }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <AuthHero />
        <div className="card">
          <h2>Bienvenido de vuelta</h2>
          <p className="muted small">Elige cómo prefieres identificarte</p>
          <div className="seg" role="tablist" aria-label="Método de inicio de sesión">
            <button type="button" role="tab" aria-selected={tab === 'face'} onClick={() => { setTab('face'); setError(null); }}>🙂 Mi rostro</button>
            <button type="button" role="tab" aria-selected={tab === 'password'} onClick={() => setTab('password')}>🔑 Contraseña</button>
          </div>
          {tab === 'face' ? (
            <FaceLoginPanel onSuccess={() => nav(from, { replace: true })} />
          ) : (
          <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
          </div>
          <div className="field">
            <label htmlFor="pw">Contraseña</label>
            <input id="pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="spread small" style={{ marginBottom: 14 }}>
            <span />
            <button type="button" className="icon-btn small" style={{ fontSize: '.85rem', color: 'var(--cyan)' }} onClick={forgot}>¿Olvidaste tu contraseña?</button>
          </div>
          <ErrorBox error={error} />
          {info && <div className="notice">{info}</div>}
          <button className="btn btn-cyan btn-block mt" disabled={busy}>{busy ? 'Entrando…' : 'Iniciar sesión'}</button>
          </form>
          )}
          <p className="center small mt mb0 muted">¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
          <div className="divider">o</div>
          <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={() => run(() => api.signInGuest())}>Continuar como invitado</button>
        </div>

        {api.mode === 'demo' && (
          <div className="card mt">
            <div className="spread" style={{ marginBottom: 8 }}>
              <strong>Modo demo</strong><span className="mode-pill">Sin servidor</span>
            </div>
            <p className="small muted">Los datos se guardan en este navegador. Entra con una cuenta de ejemplo para probar cada rol (contraseña <code>{DEMO_PASSWORD}</code>):</p>
            <div className="demo-chips">
              {DEMO_ACCOUNTS.map(([user, label]) => (
                <button key={user} className="btn btn-ghost btn-sm" disabled={busy}
                  onClick={() => run(() => api.signIn(`${user}@moodwave.app`, DEMO_PASSWORD))}>{label}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
