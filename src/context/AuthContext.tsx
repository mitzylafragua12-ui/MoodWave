import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { Profile } from '../lib/types';

interface AuthState {
  userId: string | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

// Al cerrar sesión a propósito no se recuerda la página anterior: quien entre después va a SU inicio.
let explicitSignOut = false;
export const wasExplicitSignOut = () => explicitSignOut;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (id: string | null) => {
    if (id) explicitSignOut = false;
    if (!id) { setProfile(null); return; }
    try {
      setProfile(await api.getProfile());
    } catch {
      // El trigger de perfil puede tardar unos ms tras el registro: reintenta una vez.
      await new Promise((r) => setTimeout(r, 800));
      try { setProfile(await api.getProfile()); } catch { setProfile(null); }
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api.getUserId().then(async (id) => {
      if (!alive) return;
      setUserId(id);
      await loadProfile(id);
      if (alive) setLoading(false);
    });
    const off = api.onAuthChange(async (id) => {
      setUserId(id);
      await loadProfile(id);
      setLoading(false);
    });
    return () => { alive = false; off(); };
  }, [loadProfile]);

  const refresh = useCallback(() => loadProfile(userId), [loadProfile, userId]);
  const signOut = useCallback(async () => { explicitSignOut = true; await api.signOut(); setUserId(null); setProfile(null); }, []);

  return <Ctx.Provider value={{ userId, profile, loading, refresh, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fuera de AuthProvider');
  return v;
}

/** Perfil garantizado dentro de rutas protegidas. */
export function useProfile(): Profile {
  const { profile } = useAuth();
  if (!profile) throw new Error('Sin perfil');
  return profile;
}
