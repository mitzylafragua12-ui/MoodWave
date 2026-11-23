import type { Api } from './types';
import { createSupabaseApi } from './supabaseApi';
import { createDemoApi } from './demoApi';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Si hay credenciales de Supabase se usa el backend real; si no, el modo demo local. */
export const api: Api = url && key ? createSupabaseApi(url, key) : createDemoApi();
export type { Api };
