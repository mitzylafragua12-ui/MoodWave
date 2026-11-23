// Edge Function: inicio de sesión con rostro.
//
// Recibe el descriptor facial (128 números) calculado en el navegador, lo compara con
// las plantillas guardadas (1:N, umbral 0.45) usando service_role y, si hay coincidencia, emite un token de un solo uso para abrir la sesión con
// supabase.auth.verifyOtp({ token_hash, type: 'magiclink' }).
//
// Desplegar:  supabase functions deploy face-login
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.

import { createClient } from 'npm:@supabase/supabase-js@2.119.2';

const THRESHOLD = 0.45;
const MAX_FAILED_PER_15_MIN = 10;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export function isValidDescriptor(d: unknown): d is number[] {
  return Array.isArray(d) && d.length === 128 && d.every((x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 10);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'desconocida';

  let descriptor: unknown;
  try { descriptor = (await req.json()).descriptor; } catch { return json(400, { error: 'Cuerpo inválido' }); }
  if (!isValidDescriptor(descriptor)) return json(400, { error: 'Plantilla facial inválida' });

  const { data: failed } = await admin.rpc('face_attempts_recent', { p_ip: ip, p_minutes: 15 });
  if ((failed ?? 0) >= MAX_FAILED_PER_15_MIN) {
    return json(429, { error: 'Demasiados intentos fallidos. Espera unos minutos o entra con tu contraseña.' });
  }

  const { data: hits, error: matchErr } = await admin.rpc('face_match', { p_descriptor: descriptor, p_threshold: THRESHOLD });
  if (matchErr) return json(500, { error: 'No se pudo verificar el rostro' });
  const hit = (hits as { user_id: string; distance: number }[] | null)?.[0];

  if (!hit) {
    await admin.from('face_login_attempts').insert({ ip, success: false });
    return json(401, { error: 'No te reconozco. Usa tu contraseña o vuelve a registrar tu rostro.' });
  }

  const { data: profile } = await admin.from('users').select('suspended').eq('id', hit.user_id).single();
  if (profile?.suspended) return json(403, { error: 'Tu cuenta está suspendida.' });

  const { data: authUser, error: userErr } = await admin.auth.admin.getUserById(hit.user_id);
  const email = authUser?.user?.email;
  if (userErr || !email) return json(400, { error: 'Esta cuenta no tiene correo; entra con contraseña.' });

  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkErr || !link?.properties?.hashed_token) return json(500, { error: 'No se pudo abrir la sesión' });

  await admin.from('face_login_attempts').insert({ ip, success: true, user_id: hit.user_id, distance: hit.distance });
  return json(200, { token_hash: link.properties.hashed_token });
});
