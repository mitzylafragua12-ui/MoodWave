import { useEffect, useState } from 'react';
import { asset } from '../lib/paths';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useProfile } from '../context/AuthContext';
import { can, isStaff, rolePanelLabel, type Perm } from '../lib/catalog';
import { RoleChip } from './ui';
import { preloadFaceApi } from '../lib/faceDetection';
import { t, tx } from '../i18n';

interface NavItem { to: string; label: string; ico: string; perm?: Perm; end?: boolean }

// Parte de bienestar: la usan todos los roles.
const wellnessItems = (): NavItem[] => [
  { to: '/detectar', label: t('Detectar'), ico: '📷' },
  { to: '/actividades', label: t('Actividades'), ico: '✨' },
  { to: '/historial', label: t('Historial'), ico: '🗂️' },
  { to: '/ranking', label: t('Ranking'), ico: '🏆' },
  { to: '/mentoria', label: t('Mi orientación'), ico: '🤝' },
  { to: '/perfil', label: t('Perfil'), ico: '👤' },
];
// Herramientas de trabajo: cada rol ve solo las suyas.
const workItems = (): NavItem[] => [
  { to: '/curaduria', label: t('Contenido'), ico: '🎵', perm: 'curate' },
  { to: '/acompanados', label: t('Mis acompañados'), ico: '🧑‍🤝‍🧑', perm: 'mentor' },
  { to: '/moderacion', label: t('Reportes'), ico: '🛡️', perm: 'moderate' },
  { to: '/analitica', label: t('Analítica'), ico: '📊', perm: 'analytics' },
  { to: '/admin', label: t('Administración'), ico: '⚙️', perm: 'manage_users' },
];

export function Layout() {
  const profile = useProfile();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  // Precarga y calienta el modelo de emociones en segundo plano: «Detectar» abre al instante.
  useEffect(() => { preloadFaceApi(); }, []);

  const staff = isStaff(profile.role);
  const wellness = wellnessItems();
  const work = workItems().filter((i) => can(profile.role, i.perm!));
  const home: NavItem = { to: '/', label: staff ? rolePanelLabel(profile.role) : t('Inicio'), ico: staff ? '🧭' : '🏠', end: true };
  const bottom: NavItem[] = [{ ...home, label: t('Inicio') }, wellness[0], wellness[1], wellness[5]];
  const link = (i: NavItem) => (
    <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
      <span className="ico" aria-hidden>{i.ico}</span>{i.label}
    </NavLink>
  );

  return (
    <div className="app-shell">
      <a href="#contenido" className="sr-only">{t('Saltar al contenido')}</a>
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label={t('Navegación principal')}>
        <Link to="/" className="brand"><img src={asset('icon.svg')} alt="" /><span>Mood<b>Wave</b></span></Link>
        {link(home)}
        {work.length > 0 && <div className="nav-section">{t('Mi trabajo')}</div>}
        {work.map(link)}
        <div className="nav-section">{t('Mi bienestar')}</div>
        {staff && link({ to: '/bienestar', label: t('Mi progreso'), ico: '🌊' })}
        {wellness.map(link)}
        <div className="sidebar-footer stack" style={{ gap: 10 }}>
          <div className="spread">
            <div>
              <div style={{ fontWeight: 700 }}>@{profile.username}</div>
              <RoleChip role={profile.role} />
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>{t('Cerrar sesión')}</button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <div className="main">
        <div className="topbar">
          <Link to="/" className="brand" style={{ fontSize: '1.2rem' }}><img src={asset('icon.svg')} alt="" /><span>Mood<b>Wave</b></span></Link>
          <button className="icon-btn" aria-label={t('Abrir menú')} aria-expanded={open} onClick={() => setOpen(true)}>☰</button>
        </div>
        {profile.suspended && (
          <div className="page" style={{ paddingBottom: 0 }}>
            <div className="error">{t('Tu cuenta está suspendida tras revisar un reporte. Puedes consultar tu información, pero no registrar nuevas actividades.')}</div>
          </div>
        )}
        {profile.role === 'guest' && (
          <div className="page" style={{ paddingBottom: 0 }}>
            <div className="notice">{tx('Estás usando MoodWave como visitante. {link} para aparecer en el ranking y hablar con un orientador.', { link: <Link to="/registro" onClick={signOut}>{t('Crea una cuenta')}</Link> })}</div>
          </div>
        )}
        <main id="contenido"><Outlet /></main>
      </div>

      <nav className="bottom-nav" aria-label={t('Navegación rápida')}>
        {bottom.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="dot" aria-hidden>{i.ico}</span>{i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
