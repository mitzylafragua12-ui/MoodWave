import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { roleAtLeast } from './lib/catalog';
import type { RoleKey } from './lib/types';
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

function Protected({ children }: { children: ReactNode }) {
  const { profile, loading, userId } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!userId) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!profile) return <div className="page"><div className="error">No se pudo cargar tu perfil. Verifica que el esquema SQL esté instalado en Supabase.</div></div>;
  return <>{children}</>;
}

function RequireRole({ min, children }: { min: RoleKey; children: ReactNode }) {
  const { profile } = useAuth();
  if (!profile || !roleAtLeast(profile.role, min)) {
    return <div className="page"><div className="error">No tienes permisos para ver esta sección.</div></div>;
  }
  return <>{children}</>;
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
        <Route index element={<Dashboard />} />
        <Route path="detectar" element={<Detect />} />
        <Route path="actividades" element={<Activities />} />
        <Route path="actividad/:assignmentId" element={<ActivityRunner />} />
        <Route path="historial" element={<History />} />
        <Route path="perfil" element={<Profile />} />
        <Route path="ranking" element={<Leaderboard />} />
        <Route path="mentoria" element={<Mentorship />} />
        <Route path="curaduria" element={<RequireRole min="curator"><Curation /></RequireRole>} />
        <Route path="moderacion" element={<RequireRole min="moderator"><Moderation /></RequireRole>} />
        <Route path="analitica" element={<RequireRole min="analyst"><Analytics /></RequireRole>} />
        <Route path="admin" element={<RequireRole min="admin"><Admin /></RequireRole>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
