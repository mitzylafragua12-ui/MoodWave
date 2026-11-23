import type { Api } from './types';
import { createSupabaseApi } from './supabaseApi';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** MoodWave funciona solo con la base de datos real (Supabase). Sin credenciales se muestra una pantalla de configuración. */
export const supabaseConfigured = Boolean(url && key);
export const api: Api = createSupabaseApi(url || 'http://supabase-no-configurado.invalid', key || 'sin-clave');
export type { Api };
