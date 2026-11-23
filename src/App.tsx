import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth, wasExplicitSignOut } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { can, isStaff, type Perm } from './lib/catalog';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Detect from './pages/Detect';
import Activities from './pages/Activities';
import ActivityRunner from './pages/ActivityRunner';
import History from './pages/History';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import Mentorship from './pages/Mentorship';
import Moderation from './pages/Moderation';
import Admin from './pages/Admin';
import Analytics from './pages/Analytics';
import Curation from './pages/Curation';
import NotFound from './pages/NotFound';
import StaffHome from './pages/StaffHome';
import Mentees from './pages/Mentees';
import MenteeDetail from './pages/MenteeDetail';
import { t } from './i18n';

function Protected({ children }: { children: ReactNode }) {
  const { profile, loading, userId } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!userId) return <Navigate to="/login" replace state={wasExplicitSignOut() ? null : { from: loc.pathname + loc.search }} />;
  if (!profile) return <div className="page"><div className="error">{t('No se pudo cargar tu perfil. Verifica que el esquema SQL esté instalado en Supabase.')}</div></div>;
  return <>{children}</>;
}

function RequirePerm({ perm, children }: { perm: Perm | Perm[]; children: ReactNode }) {
  const { profile } = useAuth();
  const perms = Array.isArray(perm) ? perm : [perm];
  if (!profile || !perms.some((p) => can(profile.role, p))) {
    return <div className="page"><div className="error">{t('No tienes permisos para ver esta sección.')}</div></div>;
  }
  return <>{children}</>;
}

/** Cada rol entra a su propio inicio; el usuario (listener/invitado) entra a su bienestar. */
function RoleHome() {
  const { profile } = useAuth();
  return profile && isStaff(profile.role) ? <StaffHome /> : <Dashboard />;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { userId, loading } = useAuth();
  if (loading) return <Spinner />;
  return userId ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/registro" element={<PublicOnly><Register /></PublicOnly>} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<RoleHome />} />
        <Route path="bienestar" element={<Dashboard />} />
        <Route path="detectar" element={<Detect />} />
        <Route path="actividades" element={<Activities />} />
        <Route path="actividad/:assignmentId" element={<ActivityRunner />} />
        <Route path="historial" element={<History />} />
        <Route path="perfil" element={<Profile />} />
        <Route path="ranking" element={<Leaderboard />} />
        <Route path="mentoria" element={<Mentorship />} />
        <Route path="curaduria" element={<RequirePerm perm="curate"><Curation /></RequirePerm>} />
        <Route path="acompanados" element={<RequirePerm perm="mentor"><Mentees /></RequirePerm>} />
        <Route path="acompanados/:userId" element={<RequirePerm perm="mentor"><MenteeDetail /></RequirePerm>} />
        <Route path="moderacion" element={<RequirePerm perm="moderate"><Moderation /></RequirePerm>} />
        <Route path="analitica" element={<RequirePerm perm="analytics"><Analytics /></RequirePerm>} />
        <Route path="admin" element={<RequirePerm perm={['manage_users', 'manage_badges']}><Admin /></RequirePerm>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
