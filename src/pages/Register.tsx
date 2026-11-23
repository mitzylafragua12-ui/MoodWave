import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ErrorBox } from '../components/ui';
import { errMsg } from '../context/ToastContext';
import { AuthHero } from './Login';

export default function Register() {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return setError('El usuario debe tener 3-24 caracteres: letras, números o guion bajo.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Ingresa un correo válido.');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setBusy(true); setError(null);
    try {
      const r = await api.signUp(email, password, username);
      if (r.needsConfirmation) setDone(true); else nav('/', { replace: true });
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <AuthHero />
        {done ? (
          <div className="card center">
            <h2>Revisa tu correo</h2>
            <p className="muted">Te enviamos un enlace para confirmar tu cuenta. Después podrás iniciar sesión.</p>
            <Link to="/login" className="btn btn-primary">Ir a iniciar sesión</Link>
          </div>
        ) : (
          <form className="card" onSubmit={submit} noValidate>
            <h2>Crea tu cuenta</h2>
            <p className="muted small">Empieza a cuidar tu bienestar emocional</p>
            <div className="field">
              <label htmlFor="user">Nombre de usuario</label>
              <input id="user" className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="tu_usuario" />
            </div>
            <div className="field">
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
            </div>
            <div className="field">
              <label htmlFor="pw">Contraseña</label>
              <input id="pw" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pw2">Confirmar contraseña</label>
              <input id="pw2" className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <ErrorBox error={error} />
            <button className="btn btn-cyan btn-block mt" disabled={busy}>{busy ? 'Creando cuenta…' : 'Registrarme'}</button>
            <p className="small faint mt">Tu rostro se procesa solo en tu dispositivo: MoodWave nunca guarda ni envía imágenes de tu cámara.</p>
            <p className="center small mb0 muted">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
          </form>
        )}
      </div>
    </div>
  );
}
