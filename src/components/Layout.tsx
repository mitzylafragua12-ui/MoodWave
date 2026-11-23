import { useEffect, useState } from 'react';
import { asset } from '../lib/paths';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useProfile } from '../context/AuthContext';
import { api } from '../lib/api';
import { roleAtLeast } from '../lib/catalog';
import type { RoleKey } from '../lib/types';
import { RoleChip } from './ui';

interface NavItem { to: string; label: string; ico: string; min?: RoleKey; end?: boolean }

const MAIN: NavItem[] = [
  { to: '/', label: 'Inicio', ico: '🏠', end: true },
  { to: '/detectar', label: 'Detectar', ico: '📷' },
  { to: '/actividades', label: 'Actividades', ico: '✨' },
  { to: '/historial', label: 'Historial', ico: '🗂️' },
  { to: '/ranking', label: 'Ranking', ico: '🏆' },
  { to: '/mentoria', label: 'Mentoría', ico: '🤝' },
  { to: '/perfil', label: 'Perfil', ico: '👤' },
];
const STAFF: NavItem[] = [
  { to: '/curaduria', label: 'Curaduría', ico: '🎵', min: 'curator' },
  { to: '/moderacion', label: 'Moderación', ico: '🛡️', min: 'moderator' },
  { to: '/analitica', label: 'Analítica', ico: '📊', min: 'analyst' },
  { to: '/admin', label: 'Administración', ico: '⚙️', min: 'admin' },
];
const BOTTOM: NavItem[] = [MAIN[0], MAIN[1], MAIN[2], MAIN[6]];

export function Layout() {
  const profile = useProfile();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  const staff = STAFF.filter((i) => roleAtLeast(profile.role, i.min!));
  const link = (i: NavItem) => (
    <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
      <span className="ico" aria-hidden>{i.ico}</span>{i.label}
    </NavLink>
  );

  return (
    <div className="app-shell">
      <a href="#contenido" className="sr-only">Saltar al contenido</a>
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Navegación principal">
        <Link to="/" className="brand"><img src={asset('icon.svg')} alt="" /><span>Mood<b>Wave</b></span></Link>
        {MAIN.map(link)}
        {staff.length > 0 && <div className="nav-section">Gestión</div>}
        {staff.map(link)}
        <div className="sidebar-footer stack" style={{ gap: 10 }}>
          <div className="spread">
            <div>
              <div style={{ fontWeight: 700 }}>@{profile.username}</div>
              <RoleChip role={profile.role} />
            </div>
            {api.mode === 'demo' && <span className="mode-pill" title="Datos guardados solo en este navegador">Demo</span>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>Cerrar sesión</button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <div className="main">
        <div className="topbar">
          <Link to="/" className="brand" style={{ fontSize: '1.2rem' }}><img src={asset('icon.svg')} alt="" /><span>Mood<b>Wave</b></span></Link>
          <button className="icon-btn" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen(true)}>☰</button>
        </div>
        {profile.suspended && (
          <div className="page" style={{ paddingBottom: 0 }}>
            <div className="error">Tu cuenta está suspendida por un moderador. Puedes consultar tu información, pero no registrar nuevas actividades.</div>
          </div>
        )}
        {profile.role === 'guest' && (
          <div className="page" style={{ paddingBottom: 0 }}>
            <div className="notice">Estás usando MoodWave como invitado. <Link to="/registro" onClick={signOut}>Crea una cuenta</Link> para aparecer en el ranking y solicitar mentoría.</div>
          </div>
        )}
        <main id="contenido"><Outlet /></main>
      </div>

      <nav className="bottom-nav" aria-label="Navegación rápida">
        {BOTTOM.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="dot" aria-hidden>{i.ico}</span>{i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
