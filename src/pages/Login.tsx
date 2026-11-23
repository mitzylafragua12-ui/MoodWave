import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { asset } from '../lib/paths';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ErrorBox } from '../components/ui';
import { FaceLoginPanel, isFaceDevice } from '../components/FaceLoginPanel';
import { AuthPrefs } from '../components/SettingsCard';
import { preloadFaceApi } from '../lib/faceDetection';
import { errMsg } from '../context/ToastContext';
import { t } from '../i18n';

export function AuthHero() {
  return (
    <div className="auth-hero">
      <h1 className="sr-only">MoodWave</h1>
      {/* Dos versiones del logo: transparente para el tema oscuro y en tarjeta para el claro (solo se descarga la del tema activo). */}
      <div className="auth-logo" role="img" aria-label="MoodWave — Ride your emotions. Scan your mood · Find your flow"
        style={{ '--logo-dark': `url(${asset('logo-alpha.webp')})`, '--logo-light': `url(${asset('logo.webp')})` } as CSSProperties} />
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
  // Mientras la persona escribe, se descarga y calienta el modelo de emociones.
  useEffect(() => { preloadFaceApi(1200); }, []);

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null); setInfo(null);
    try { await fn(); nav(from, { replace: true }); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || password.length < 6) { setError(t('Ingresa un correo válido y una contraseña de al menos 6 caracteres.')); return; }
    run(() => api.signIn(email, password));
  };

  async function forgot() {
    if (!email.includes('@')) { setError(t('Escribe tu correo para enviarte el enlace de recuperación.')); return; }
    setError(null);
    try { await api.resetPassword(email); setInfo(t('Te enviamos un correo para restablecer tu contraseña.')); } catch (e) { setError(errMsg(e)); }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <AuthHero />
        <div className="card">
          <h2>{t('Bienvenido de vuelta')}</h2>
          <p className="muted small">{t('Elige cómo prefieres identificarte')}</p>
          <div className="seg" role="tablist" aria-label={t('Método de inicio de sesión')}>
            <button type="button" role="tab" aria-selected={tab === 'face'} onClick={() => { setTab('face'); setError(null); }}>{t('🙂 Mi rostro')}</button>
            <button type="button" role="tab" aria-selected={tab === 'password'} onClick={() => setTab('password')}>{t('🔑 Contraseña')}</button>
          </div>
          {tab === 'face' ? (
            <FaceLoginPanel onSuccess={() => nav(from, { replace: true })} />
          ) : (
          <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="email">{t('Correo electrónico')}</label>
            <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('tu@correo.com')} />
          </div>
          <div className="field">
            <label htmlFor="pw">{t('Contraseña')}</label>
            <input id="pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="spread small" style={{ marginBottom: 14 }}>
            <span />
            <button type="button" className="icon-btn small" style={{ fontSize: '.85rem', color: 'var(--cyan)' }} onClick={forgot}>{t('¿Olvidaste tu contraseña?')}</button>
          </div>
          <ErrorBox error={error} />
          {info && <div className="notice">{info}</div>}
          <button className="btn btn-cyan btn-block mt" disabled={busy}>{busy ? t('Entrando…') : t('Iniciar sesión')}</button>
          </form>
          )}
          <p className="center small mt mb0 muted">{t('¿No tienes cuenta?')} <Link to="/registro">{t('Regístrate')}</Link></p>
          <div className="divider">o</div>
          <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={() => run(() => api.signInGuest())}>{t('Continuar como visitante')}</button>
        </div>

        <AuthPrefs />
      </div>
    </div>
  );
}
