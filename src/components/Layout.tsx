import { useEffect, useState } from 'react';
import { asset } from '../lib/paths';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useProfile } from '../context/AuthContext';
import { api } from '../lib/api';
import { can, isStaff, ROLE_BY_KEY, type Perm } from '../lib/catalog';
import { RoleChip } from './ui';

interface NavItem { to: string; label: string; ico: string; perm?: Perm; end?: boolean }

// Parte de bienestar: la usan todos los roles.
const WELLNESS: NavItem[] = [
  { to: '/detectar', label: 'Detectar', ico: '📷' },
  { to: '/actividades', label: 'Actividades', ico: '✨' },
  { to: '/historial', label: 'Historial', ico: '🗂️' },
  { to: '/ranking', label: 'Ranking', ico: '🏆' },
  { to: '/mentoria', label: 'Mi orientación', ico: '🤝' },
  { to: '/perfil', label: 'Perfil', ico: '👤' },
];
// Herramientas de trabajo: cada rol ve solo las suyas.
const WORK: NavItem[] = [
  { to: '/curaduria', label: 'Contenido', ico: '🎵', perm: 'curate' },
  { to: '/acompanados', label: 'Mis acompañados', ico: '🧑‍🤝‍🧑', perm: 'mentor' },
  { to: '/moderacion', label: 'Reportes', ico: '🛡️', perm: 'moderate' },
  { to: '/analitica', label: 'Analítica', ico: '📊', perm: 'analytics' },
  { to: '/admin', label: 'Administración', ico: '⚙️', perm: 'manage_users' },
];

export function Layout() {
  const profile = useProfile();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  const staff = isStaff(profile.role);
  const work = WORK.filter((i) => can(profile.role, i.perm!));
  const home: NavItem = { to: '/', label: staff ? `Panel de ${ROLE_BY_KEY[profile.role].name.toLowerCase()}` : 'Inicio', ico: staff ? '🧭' : '🏠', end: true };
  const bottom: NavItem[] = [{ ...home, label: 'Inicio' }, WELLNESS[0], WELLNESS[1], WELLNESS[5]];
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
        {link(home)}
        {work.length > 0 && <div className="nav-section">Mi trabajo</div>}
        {work.map(link)}
        <div className="nav-section">Mi bienestar</div>
        {staff && link({ to: '/bienestar', label: 'Mi progreso', ico: '🌊' })}
        {WELLNESS.map(link)}
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
            <div className="error">Tu cuenta está suspendida por un revisor de reportes. Puedes consultar tu información, pero no registrar nuevas actividades.</div>
          </div>
        )}
        {profile.role === 'guest' && (
          <div className="page" style={{ paddingBottom: 0 }}>
            <div className="notice">Estás usando MoodWave como visitante. <Link to="/registro" onClick={signOut}>Crea una cuenta</Link> para aparecer en el ranking y hablar con un orientador.</div>
          </div>
        )}
        <main id="contenido"><Outlet /></main>
      </div>

      <nav className="bottom-nav" aria-label="Navegación rápida">
        {bottom.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="dot" aria-hidden>{i.ico}</span>{i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
