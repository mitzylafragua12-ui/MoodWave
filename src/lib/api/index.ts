import type { Api } from './types';
import { createSupabaseApi } from './supabaseApi';

/**
 * Credenciales de Supabase. Prioridad:
 *  1) config.js en tiempo de ejecución (Docker lo genera al arrancar con SUPABASE_URL / SUPABASE_ANON_KEY),
 *  2) variables de compilación VITE_SUPABASE_* (.env.production, .env.local).
 */
interface RuntimeConfig { supabaseUrl?: string; supabaseAnonKey?: string }
const runtime: RuntimeConfig = (globalThis as { __MOODWAVE_CONFIG__?: RuntimeConfig }).__MOODWAVE_CONFIG__ ?? {};
const url = runtime.supabaseUrl || (import.meta.env.VITE_SUPABASE_URL as string | undefined);
const key = runtime.supabaseAnonKey || (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

/** MoodWave funciona solo con la base de datos real (Supabase). Sin credenciales se muestra una pantalla de configuración. */
export const supabaseConfigured = Boolean(url && key);
export const api: Api = createSupabaseApi(url || 'http://supabase-no-configurado.invalid', key || 'sin-clave');
export type { Api };
