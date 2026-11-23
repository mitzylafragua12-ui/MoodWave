-- =====================================================================
--  MoodWave — Esquema de base de datos (Supabase / PostgreSQL)
--  Anexo A del Documento de Proyecto.
--
--  Ejecutar completo en: Supabase Dashboard → SQL Editor → New query.
--  Es idempotente para catálogos (on conflict do nothing / update).
--
--  Proceso de negocio modelado por etapas, cada una en su tabla:
--    detectar (detections) → recomendar (activity_assignments)
--    → completar (activity_completions) → recompensar (xp_ledger, user_badges)
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
--  1. CATÁLOGOS
-- ---------------------------------------------------------------------

create table if not exists public.roles (
  id          smallint primary key,
  key         text unique not null,
  name        text not null,
  rank        smallint not null,          -- jerarquía: mayor = más permisos
  description text not null default ''
);

insert into public.roles (id, key, name, rank, description) values
  (1, 'guest',      'Visitante',           0, 'Prueba la app sin cuenta; no aparece en el ranking.'),
  (2, 'listener',   'Usuario',            10, 'Detecta su emoción, hace actividades y gana XP.'),
  (3, 'curator',    'Editor de contenido', 20, 'Elige la música que se recomienda para cada emoción.'),
  (4, 'moderator',  'Revisor de reportes', 30, 'Revisa los reportes de los usuarios y puede suspender cuentas.'),
  (5, 'mentor',     'Orientador',         40, 'Acompaña a sus personas asignadas; ve su historial solo con su permiso.'),
  (6, 'analyst',    'Analista',     50, 'Consulta el dashboard analítico agregado.'),
  (7, 'admin',      'Administrador',60, 'Gestiona usuarios, roles y badges.'),
  (8, 'superadmin', 'Superadmin',   70, 'Control total, incluida la asignación de administradores.')
on conflict (id) do update set key = excluded.key, name = excluded.name,
  rank = excluded.rank, description = excluded.description;

create table if not exists public.emotions (
  id     smallint primary key,
  key    text unique not null,            -- clave que devuelve face-api.js
  label  text not null,
  color  text not null,
  emoji  text not null
);

insert into public.emotions (id, key, label, color, emoji) values
  (1, 'happy',     'Feliz',       '#facc15', '😊'),
  (2, 'sad',       'Triste',      '#60a5fa', '😢'),
  (3, 'angry',     'Enojo',       '#f43f5e', '😠'),
  (4, 'fearful',   'Miedo',       '#a78bfa', '😨'),
  (5, 'disgusted', 'Disgusto',    '#4ade80', '🤢'),
  (6, 'surprised', 'Sorpresa',    '#fb923c', '😮'),
  (7, 'neutral',   'Neutral',     '#94a3b8', '😐')
on conflict (id) do update set key = excluded.key, label = excluded.label,
  color = excluded.color, emoji = excluded.emoji;

create table if not exists public.activities (
  id               smallint primary key,
  key              text unique not null,
  name             text not null,
  description      text not null,
  base_xp          int not null check (base_xp > 0),
  min_duration_sec int not null default 0   -- tiempo mínimo para considerarla completada
);

insert into public.activities (id, key, name, description, base_xp, min_duration_sec) values
  (1, 'minigame',   'Minijuego',          'Un juego distinto para cada emoción.',                     30, 20),
  (2, 'journaling', 'Diario emocional',   'Escribe cómo te sientes con una guía según tu emoción.',      40, 0),
  (3, 'meditation', 'Meditación guiada',  'Respiración guiada con temporizador circular.',               50, 60),
  (4, 'music',      'Música',             'Playlist de Spotify curada para tu estado de ánimo.',         25, 60)
on conflict (id) do update set key = excluded.key, name = excluded.name,
  description = excluded.description, base_xp = excluded.base_xp,
  min_duration_sec = excluded.min_duration_sec;

-- Motor de recomendación: prioridad de cada actividad para cada emoción (1 = principal).
create table if not exists public.emotion_activity_map (
  emotion_id  smallint references public.emotions(id) on delete cascade,
  activity_id smallint references public.activities(id) on delete cascade,
  priority    smallint not null,
  reason      text not null,
  primary key (emotion_id, activity_id)
);

insert into public.emotion_activity_map (emotion_id, activity_id, priority, reason) values
  -- happy: canalizar la energía positiva
  (1, 4, 1, 'Mantén la buena vibra con música que te acompañe.'),
  (1, 1, 2, 'Aprovecha tu energía con un juego rápido.'),
  (1, 2, 3, 'Registra qué te hizo sentir bien hoy.'),
  (1, 3, 4, 'Una pausa breve para agradecer el momento.'),
  -- sad: expresar y acompañar
  (2, 2, 1, 'Escribir ayuda a ordenar lo que sientes.'),
  (2, 4, 2, 'Música suave para acompañarte.'),
  (2, 3, 3, 'Respirar con calma reduce la carga emocional.'),
  (2, 1, 4, 'Un juego ligero para distraerte un momento.'),
  -- angry: bajar la activación
  (3, 3, 1, 'La respiración lenta baja la activación del enojo.'),
  (3, 1, 2, 'Libera la tensión reventando burbujas.'),
  (3, 2, 3, 'Ponle palabras a lo que te molestó.'),
  (3, 4, 4, 'Música tranquila para soltar.'),
  -- fearful: anclar al presente
  (4, 3, 1, 'Respirar en ciclos te ancla al presente.'),
  (4, 2, 2, 'Escribir tus preocupaciones les quita peso.'),
  (4, 4, 3, 'Sonidos tranquilos para sentirte seguro.'),
  (4, 1, 4, 'Enfoca tu atención en algo sencillo.'),
  -- disgusted: cambiar de foco
  (5, 1, 1, 'Cambia de foco con un juego rápido.'),
  (5, 3, 2, 'Una respiración para resetear.'),
  (5, 4, 3, 'Música para cambiar el ambiente.'),
  (5, 2, 4, 'Escribe qué te incomodó.'),
  -- surprised: procesar
  (6, 2, 1, 'Escribe lo que te sorprendió para procesarlo.'),
  (6, 3, 2, 'Una pausa para asimilar.'),
  (6, 1, 3, 'Canaliza la sorpresa en un juego.'),
  (6, 4, 4, 'Música para acompañar el momento.'),
  -- neutral: chequeo y hábito
  (7, 3, 1, 'Un momento de atención plena para tu día.'),
  (7, 2, 2, 'Haz un chequeo rápido de cómo estás.'),
  (7, 4, 3, 'Descubre música nueva.'),
  (7, 1, 4, 'Un juego para activar tu mente.')
on conflict (emotion_id, activity_id) do update set priority = excluded.priority, reason = excluded.reason;

-- Playlists de Spotify por emoción (gestionadas por curadores).
create table if not exists public.emotion_playlists (
  emotion_id          smallint primary key references public.emotions(id) on delete cascade,
  spotify_playlist_id text not null,
  title               text not null,
  curated_by          uuid,
  updated_at          timestamptz not null default now()
);

insert into public.emotion_playlists (emotion_id, spotify_playlist_id, title) values
  (1, '37i9dQZF1DXdPec7aLTmlC', 'Happy Hits!'),
  (2, '37i9dQZF1DX4sWSpwq3LiO', 'Peaceful Piano'),
  (3, '37i9dQZF1DX4sWSpwq3LiO', 'Peaceful Piano'),
  (4, '37i9dQZF1DX4sWSpwq3LiO', 'Peaceful Piano'),
  (5, '37i9dQZF1DX3rxVfibe1L0', 'Mood Booster'),
  (6, '37i9dQZF1DX3rxVfibe1L0', 'Mood Booster'),
  (7, '37i9dQZF1DWZeKCadgRdKQ', 'Deep Focus')
on conflict (emotion_id) do nothing;

-- ---------------------------------------------------------------------
--  2. TABLAS DEL PROCESO
-- ---------------------------------------------------------------------

create table if not exists public.users (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text unique not null check (char_length(username) between 3 and 24),
  display_name     text not null default '',
  role_id          smallint not null default 2 references public.roles(id),
  -- Valores cache, recalculados desde xp_ledger por trigger:
  xp               int not null default 0,
  level            smallint not null default 1,
  streak           int not null default 0,
  longest_streak   int not null default 0,
  last_active_date date,
  suspended        boolean not null default false,
  created_at       timestamptz not null default now()
);

create table if not exists public.detections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  emotion_id  smallint not null references public.emotions(id),
  confidence  numeric(5,4) not null check (confidence between 0 and 1),
  scores      jsonb not null default '{}'::jsonb,   -- probabilidades de las 7 emociones
  source      text not null default 'camera' check (source in ('camera','manual')),
  created_at  timestamptz not null default now()
);
create index if not exists detections_user_created_idx on public.detections (user_id, created_at desc);

create table if not exists public.activity_assignments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  detection_id uuid references public.detections(id) on delete set null,
  activity_id  smallint not null references public.activities(id),
  reason       text not null default 'recommended' check (reason in ('recommended','alternative','free_choice')),
  created_at   timestamptz not null default now()
);
create index if not exists assignments_user_idx on public.activity_assignments (user_id, created_at desc);

create table if not exists public.activity_completions (
  id               uuid primary key default gen_random_uuid(),
  assignment_id    uuid unique not null references public.activity_assignments(id) on delete cascade,
  user_id          uuid not null references public.users(id) on delete cascade,
  duration_seconds int not null default 0,
  score            int,                       -- puntaje del minijuego (opcional)
  game_key         text,                      -- qué minijuego se jugó
  created_at       timestamptz not null default now()
);
create index if not exists completions_user_idx on public.activity_completions (user_id, created_at desc);
alter table public.activity_completions add column if not exists game_key text;

create table if not exists public.badges (
  id               smallint generated by default as identity primary key,
  key              text unique not null,
  name             text not null,
  description      text not null,
  icon             text not null,
  xp_reward        int not null default 0,
  rule_type        text not null check (rule_type in
                     ('detections','completions','activity','streak','level','distinct_emotions','distinct_activities')),
  rule_activity_id smallint references public.activities(id),
  threshold        int not null check (threshold > 0)
);

insert into public.badges (key, name, description, icon, xp_reward, rule_type, rule_activity_id, threshold) values
  ('first_wave',     'Primera ola',          'Realiza tu primera detección emocional.',        '🌊', 10, 'detections',          null, 1),
  ('first_step',     'Primer paso',          'Completa tu primera actividad.',                 '👣', 10, 'completions',         null, 1),
  ('ten_activities', 'Constancia',           'Completa 10 actividades.',                       '🏅', 25, 'completions',         null, 10),
  ('pen',            'Pluma sincera',        'Escribe 5 entradas en tu diario.',               '✍️', 20, 'activity',            2,    5),
  ('zen',            'Mente en calma',       'Completa 5 meditaciones.',                       '🧘', 20, 'activity',            3,    5),
  ('gamer',          'Revientaburbujas',     'Juega 5 veces el minijuego.',                    '🫧', 20, 'activity',            1,    5),
  ('dj',             'Oído emocional',       'Escucha 5 playlists.',                           '🎧', 20, 'activity',            4,    5),
  ('streak_3',       'Racha de 3',           'Mantén una racha de 3 días.',                    '🔥', 15, 'streak',              null, 3),
  ('streak_7',       'Semana completa',      'Mantén una racha de 7 días.',                    '⚡', 30, 'streak',              null, 7),
  ('streak_30',      'Hábito de acero',      'Mantén una racha de 30 días.',                   '💎', 50, 'streak',              null, 30),
  ('explorer',       'Explorador',           'Prueba las 4 actividades.',                      '🧭', 20, 'distinct_activities', null, 4),
  ('rainbow',        'Arcoíris emocional',   'Registra las 7 emociones.',                      '🌈', 30, 'distinct_emotions',   null, 7),
  ('level_5',        'Oleaje',               'Alcanza el nivel 5.',                            '⭐', 0,  'level',               null, 5),
  ('level_10',       'Leyenda MoodWave',     'Alcanza el nivel 10.',                           '👑', 0,  'level',               null, 10)
on conflict (key) do nothing;

create table if not exists public.user_badges (
  user_id   uuid references public.users(id) on delete cascade,
  badge_id  smallint references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- Libro mayor de XP: solo inserciones (nunca update/delete).
create table if not exists public.xp_ledger (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.users(id) on delete cascade,
  amount        int not null check (amount > 0),
  reason        text not null check (reason in ('activity','daily_checkin','badge','admin_adjustment')),
  completion_id uuid references public.activity_completions(id) on delete set null,
  badge_id      smallint references public.badges(id) on delete set null,
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists xp_ledger_user_idx on public.xp_ledger (user_id, created_at desc);

create table if not exists public.journal_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  completion_id uuid references public.activity_completions(id) on delete set null,
  emotion_id    smallint references public.emotions(id),
  prompt        text not null default '',
  content       text not null check (char_length(content) between 1 and 5000),
  created_at    timestamptz not null default now()
);

create table if not exists public.mentor_sessions (
  id           uuid primary key default gen_random_uuid(),
  mentee_id    uuid not null references public.users(id) on delete cascade,
  mentor_id    uuid references public.users(id) on delete set null,
  topic        text not null check (char_length(topic) between 3 and 500),
  status       text not null default 'requested' check (status in ('requested','active','completed','cancelled')),
  notes        text,                         -- notas privadas del mentor
  feedback     text,                         -- retroalimentación visible para el usuario
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references public.users(id) on delete cascade,
  reported_user_id uuid references public.users(id) on delete cascade,
  target_type      text not null check (target_type in ('user','mentor_session')),
  target_id        uuid,
  reason           text not null check (char_length(reason) between 3 and 1000),
  status           text not null default 'open' check (status in ('open','resolved','dismissed')),
  resolution       text,
  resolved_by      uuid references public.users(id),
  resolved_at      timestamptz,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  3. FUNCIONES AUXILIARES
-- ---------------------------------------------------------------------

-- Zona horaria usada para días de racha y tope diario de XP.
create or replace function public.mw_today() returns date
language sql stable as $$ select (now() at time zone 'America/Mexico_City')::date $$;

create or replace function public.mw_day_start() returns timestamptz
language sql stable as $$ select (public.mw_today()::timestamp at time zone 'America/Mexico_City') $$;

create or replace function public.current_role_rank() returns smallint
language sql stable security definer set search_path = public as $$
  select coalesce((select r.rank from public.users u join public.roles r on r.id = u.role_id
                   where u.id = auth.uid()), -1)::smallint
$$;

-- Permisos explícitos por rol (cada rol ve solo sus herramientas; el rango solo protege a los admins).
create table if not exists public.role_permissions (
  role_id smallint references public.roles(id) on delete cascade,
  perm    text not null check (perm in ('curate','moderate','mentor','analytics','manage_users','manage_badges','manage_admins')),
  primary key (role_id, perm)
);
delete from public.role_permissions;
insert into public.role_permissions (role_id, perm) values
  (3, 'curate'),
  (4, 'moderate'),
  (5, 'mentor'),
  (6, 'analytics'),
  (7, 'manage_users'), (7, 'manage_badges'), (7, 'analytics'), (7, 'moderate'),
  (8, 'curate'), (8, 'moderate'), (8, 'mentor'), (8, 'analytics'),
  (8, 'manage_users'), (8, 'manage_badges'), (8, 'manage_admins');

create or replace function public.has_perm(p_perm text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users u join public.role_permissions rp on rp.role_id = u.role_id
                  where u.id = auth.uid() and rp.perm = p_perm and not u.suspended)
$$;



-- Nivel a partir del XP total (10 niveles).
create or replace function public.level_for_xp(p_xp int) returns smallint
language sql immutable as $$
  select (case
    when p_xp >= 3200 then 10 when p_xp >= 2500 then 9 when p_xp >= 1900 then 8
    when p_xp >= 1400 then 7  when p_xp >= 1000 then 6 when p_xp >= 700  then 5
    when p_xp >= 450  then 4  when p_xp >= 250  then 3 when p_xp >= 100  then 2
    else 1 end)::smallint
$$;

-- Límite RNF-04: máximo 200 XP por usuario por día.
create or replace function public.xp_remaining_today(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select greatest(0, 200 - coalesce((select sum(amount) from public.xp_ledger
    where user_id = p_user and created_at >= public.mw_day_start()), 0))::int
$$;

-- Otorga XP respetando el tope diario. Devuelve lo realmente otorgado.
create or replace function public.grant_xp(p_user uuid, p_amount int, p_reason text,
  p_completion uuid default null, p_badge smallint default null, p_note text default null)
returns int language plpgsql security definer set search_path = public as $$
declare v_grant int;
begin
  v_grant := least(p_amount, public.xp_remaining_today(p_user));
  if v_grant > 0 then
    insert into public.xp_ledger (user_id, amount, reason, completion_id, badge_id, note)
    values (p_user, v_grant, p_reason, p_completion, p_badge, p_note);
  end if;
  return v_grant;
end $$;

-- Trigger: el XP y nivel del perfil son cache del libro mayor.
create or replace function public.on_xp_ledger_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.users
     set xp = xp + new.amount,
         level = public.level_for_xp(xp + new.amount)
   where id = new.user_id;
  return new;
end $$;

drop trigger if exists trg_xp_ledger_insert on public.xp_ledger;
create trigger trg_xp_ledger_insert after insert on public.xp_ledger
  for each row execute function public.on_xp_ledger_insert();

-- El libro mayor es inmutable.
create or replace function public.prevent_ledger_mutation() returns trigger
language plpgsql as $$
begin
  -- pg_trigger_depth() > 1: borrado en cascada al eliminar la cuenta (permitido).
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  raise exception '% es de solo inserción', tg_table_name;
end $$;

drop trigger if exists trg_xp_ledger_immutable on public.xp_ledger;
create trigger trg_xp_ledger_immutable before update or delete on public.xp_ledger
  for each row execute function public.prevent_ledger_mutation();

-- Evalúa y otorga badges pendientes. Devuelve los badges nuevos.
create or replace function public.evaluate_badges(p_user uuid)
returns setof public.badges language plpgsql security definer set search_path = public as $$
declare
  b public.badges;
  v_value int;
  u public.users;
begin
  loop
    -- Se repite porque el XP de un badge puede subir de nivel y desbloquear otro.
    select * into u from public.users where id = p_user;
    select bb.* into b from public.badges bb
     where not exists (select 1 from public.user_badges ub where ub.user_id = p_user and ub.badge_id = bb.id)
       and (case bb.rule_type
         when 'detections'  then (select count(*) from public.detections where user_id = p_user)
         when 'completions' then (select count(*) from public.activity_completions where user_id = p_user)
         when 'activity'    then (select count(*) from public.activity_completions c
                                    join public.activity_assignments a on a.id = c.assignment_id
                                   where c.user_id = p_user and a.activity_id = bb.rule_activity_id)
         when 'streak'      then greatest(u.streak, u.longest_streak)
         when 'level'       then u.level
         when 'distinct_emotions' then (select count(distinct emotion_id) from public.detections where user_id = p_user)
         when 'distinct_activities' then (select count(distinct a.activity_id) from public.activity_completions c
                                    join public.activity_assignments a on a.id = c.assignment_id where c.user_id = p_user)
         else 0 end) >= bb.threshold
     order by bb.id limit 1;
    exit when not found;
    insert into public.user_badges (user_id, badge_id) values (p_user, b.id);
    if b.xp_reward > 0 then
      perform public.grant_xp(p_user, b.xp_reward, 'badge', null, b.id, b.name);
    end if;
    return next b;
  end loop;
end $$;

-- Recomendación: actividades ordenadas por prioridad para una emoción.
create or replace function public.recommend_activities(p_emotion_key text)
returns table (activity_key text, activity_name text, priority smallint, reason text)
language sql stable security definer set search_path = public as $$
  select a.key, a.name, m.priority, m.reason
    from public.emotion_activity_map m
    join public.emotions e on e.id = m.emotion_id
    join public.activities a on a.id = m.activity_id
   where e.key = p_emotion_key
   order by m.priority
$$;

-- ---------------------------------------------------------------------
--  4. RPC DEL FLUJO PRINCIPAL (llamadas desde el frontend)
-- ---------------------------------------------------------------------

create or replace function public.assert_active_user() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if exists (select 1 from public.users where id = v_uid and suspended) then
    raise exception 'Cuenta suspendida';
  end if;
  return v_uid;
end $$;

-- Etapas 1-2: registrar detección y asignar la actividad recomendada.
create or replace function public.record_detection(p_emotion_key text, p_confidence numeric,
  p_scores jsonb default '{}'::jsonb, p_source text default 'camera')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public.assert_active_user();
  v_emotion public.emotions;
  v_detection uuid;
  v_assignment uuid;
  v_top record;
  v_xp int := 0;
  v_first_today boolean;
  v_badges jsonb;
begin
  select * into v_emotion from public.emotions where key = p_emotion_key;
  if not found then raise exception 'Emoción desconocida: %', p_emotion_key; end if;

  v_first_today := not exists (select 1 from public.detections
                                where user_id = v_uid and created_at >= public.mw_day_start());

  insert into public.detections (user_id, emotion_id, confidence, scores, source)
  values (v_uid, v_emotion.id, least(greatest(p_confidence, 0), 1), coalesce(p_scores, '{}'::jsonb), p_source)
  returning id into v_detection;

  select * into v_top from public.recommend_activities(p_emotion_key) limit 1;
  insert into public.activity_assignments (user_id, detection_id, activity_id, reason)
  values (v_uid, v_detection, (select id from public.activities where key = v_top.activity_key), 'recommended')
  returning id into v_assignment;

  if v_first_today then
    v_xp := public.grant_xp(v_uid, 10, 'daily_checkin', null, null, 'Check-in emocional del día');
  end if;

  select coalesce(jsonb_agg(to_jsonb(nb)), '[]'::jsonb) into v_badges from public.evaluate_badges(v_uid) nb;

  return jsonb_build_object(
    'detection_id', v_detection,
    'assignment_id', v_assignment,
    'emotion', p_emotion_key,
    'xp_granted', v_xp,
    'new_badges', v_badges
  );
end $$;

-- Crear asignación manual (alternativa elegida o actividad libre).
create or replace function public.assign_activity(p_activity_key text, p_detection_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public.assert_active_user(); v_id uuid; v_act smallint;
begin
  select id into v_act from public.activities where key = p_activity_key;
  if v_act is null then raise exception 'Actividad desconocida'; end if;
  if p_detection_id is not null and not exists
     (select 1 from public.detections where id = p_detection_id and user_id = v_uid) then
    raise exception 'Detección inválida';
  end if;
  -- Reutiliza una asignación pendiente idéntica para no duplicar.
  select a.id into v_id from public.activity_assignments a
   where a.user_id = v_uid and a.activity_id = v_act
     and a.detection_id is not distinct from p_detection_id
     and not exists (select 1 from public.activity_completions c where c.assignment_id = a.id)
   limit 1;
  if v_id is null then
    insert into public.activity_assignments (user_id, detection_id, activity_id, reason)
    values (v_uid, p_detection_id, v_act,
            case when p_detection_id is null then 'free_choice' else 'alternative' end)
    returning id into v_id;
  end if;
  return v_id;
end $$;

-- Etapas 3-4: completar actividad, otorgar XP, actualizar racha y badges.
drop function if exists public.complete_activity(uuid, int, int, text, text);
create or replace function public.complete_activity(p_assignment_id uuid, p_duration_seconds int default 0,
  p_score int default null, p_journal_text text default null, p_journal_prompt text default null,
  p_game text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := public.assert_active_user();
  v_assign public.activity_assignments;
  v_act public.activities;
  v_completion uuid;
  v_xp int;
  v_level_before smallint;
  v_user public.users;
  v_today date := public.mw_today();
  v_badges jsonb;
  v_emotion smallint;
begin
  select * into v_assign from public.activity_assignments where id = p_assignment_id and user_id = v_uid;
  if not found then raise exception 'Asignación no encontrada'; end if;
  if exists (select 1 from public.activity_completions where assignment_id = p_assignment_id) then
    raise exception 'Esta actividad ya fue completada';
  end if;
  select * into v_act from public.activities where id = v_assign.activity_id;
  if coalesce(p_duration_seconds, 0) < v_act.min_duration_sec then
    raise exception 'Duración insuficiente: mínimo % segundos', v_act.min_duration_sec;
  end if;
  if v_act.key = 'journaling' and char_length(coalesce(trim(p_journal_text), '')) < 20 then
    raise exception 'La entrada del diario debe tener al menos 20 caracteres';
  end if;

  select level into v_level_before from public.users where id = v_uid;

  insert into public.activity_completions (assignment_id, user_id, duration_seconds, score, game_key)
  values (p_assignment_id, v_uid, coalesce(p_duration_seconds, 0), p_score,
          case when v_act.key = 'minigame' then left(p_game, 40) end)
  returning id into v_completion;

  if v_act.key = 'journaling' then
    select emotion_id into v_emotion from public.detections where id = v_assign.detection_id;
    insert into public.journal_entries (user_id, completion_id, emotion_id, prompt, content)
    values (v_uid, v_completion, v_emotion, coalesce(p_journal_prompt, ''), trim(p_journal_text));
  end if;

  -- Racha: días consecutivos con al menos una actividad completada.
  update public.users set
    streak = case
      when last_active_date = v_today then streak
      when last_active_date = v_today - 1 then streak + 1
      else 1 end,
    last_active_date = v_today
  where id = v_uid;
  update public.users set longest_streak = greatest(longest_streak, streak) where id = v_uid;

  v_xp := public.grant_xp(v_uid, v_act.base_xp, 'activity', v_completion, null, v_act.name);

  select coalesce(jsonb_agg(to_jsonb(nb)), '[]'::jsonb) into v_badges from public.evaluate_badges(v_uid) nb;
  select * into v_user from public.users where id = v_uid;

  return jsonb_build_object(
    'completion_id', v_completion,
    'xp_granted', v_xp,
    'xp_base', v_act.base_xp,
    'capped', v_xp < v_act.base_xp,
    'xp_total', v_user.xp,
    'level', v_user.level,
    'leveled_up', v_user.level > v_level_before,
    'streak', v_user.streak,
    'new_badges', v_badges
  );
end $$;

-- Al consultar el perfil, una racha vencida (sin actividad ayer ni hoy) se muestra en 0.
create or replace function public.refresh_streak() returns void
language sql security definer set search_path = public as $$
  update public.users set streak = 0
   where id = auth.uid() and streak > 0 and last_active_date < public.mw_today() - 1
$$;

-- Leaderboard público (sin exponer datos privados).
create or replace function public.get_leaderboard(p_limit int default 20)
returns table (user_id uuid, username text, display_name text, level smallint, xp int, streak int)
language sql stable security definer set search_path = public as $$
  select u.id, u.username, u.display_name, u.level, u.xp,
         case when u.last_active_date >= public.mw_today() - 1 then u.streak else 0 end
    from public.users u join public.roles r on r.id = u.role_id
   where not u.suspended and r.key <> 'guest'
   order by u.xp desc, u.created_at asc
   limit least(p_limit, 100)
$$;

-- Dashboard analítico agregado (analyst, admin, superadmin).
create or replace function public.get_analytics(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_since timestamptz := now() - make_interval(days => p_days);
begin
  if not public.has_perm('analytics') then raise exception 'Permiso denegado'; end if;
  return jsonb_build_object(
    'total_users', (select count(*) from public.users),
    'active_users', (select count(distinct user_id) from public.detections where created_at >= v_since),
    'detections', (select count(*) from public.detections where created_at >= v_since),
    'completions', (select count(*) from public.activity_completions where created_at >= v_since),
    'xp_awarded', (select coalesce(sum(amount), 0) from public.xp_ledger where created_at >= v_since),
    'emotions', (select coalesce(jsonb_agg(jsonb_build_object('key', e.key, 'count', coalesce(x.n, 0)) order by e.id), '[]')
                   from public.emotions e
                   left join (select emotion_id, count(*) n from public.detections
                               where created_at >= v_since group by emotion_id) x on x.emotion_id = e.id),
    'activities', (select coalesce(jsonb_agg(jsonb_build_object('key', a.key,
                      'assigned', coalesce(s.assigned, 0), 'completed', coalesce(s.completed, 0)) order by a.id), '[]')
                   from public.activities a
                   left join (select aa.activity_id, count(*) assigned, count(c.id) completed
                                from public.activity_assignments aa
                                left join public.activity_completions c on c.assignment_id = aa.id
                               where aa.created_at >= v_since group by aa.activity_id) s on s.activity_id = a.id),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'detections', coalesce(n, 0)) order by d), '[]')
                from (select gs::date d from generate_series((now() - make_interval(days => p_days - 1))::date, now()::date, '1 day') gs) days
                left join (select (created_at at time zone 'America/Mexico_City')::date dd, count(*) n
                             from public.detections where created_at >= v_since group by 1) x on x.dd = days.d)
  );
end $$;

-- ---------------------------------------------------------------------
--  5. ADMINISTRACIÓN Y MODERACIÓN
-- ---------------------------------------------------------------------

create or replace function public.admin_set_role(p_user uuid, p_role_key text)
returns void language plpgsql security definer set search_path = public as $$
declare v_target_rank smallint; v_new_rank smallint;
begin
  if not public.has_perm('manage_users') then raise exception 'Permiso denegado'; end if;
  select rank into v_new_rank from public.roles where key = p_role_key;
  if v_new_rank is null then raise exception 'Rol inválido'; end if;
  select r.rank into v_target_rank from public.users u join public.roles r on r.id = u.role_id where u.id = p_user;
  if p_user = auth.uid() then raise exception 'No puedes cambiar tu propio rol'; end if;
  -- Solo superadmin puede crear o modificar admins/superadmins.
  if (v_new_rank >= 60 or v_target_rank >= 60) and not public.has_perm('manage_admins') then
    raise exception 'Solo un superadmin puede gestionar administradores';
  end if;
  update public.users set role_id = (select id from public.roles where key = p_role_key) where id = p_user;
end $$;

create or replace function public.mod_set_suspended(p_user uuid, p_suspended boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_target_rank smallint;
begin
  if not public.has_perm('moderate') then raise exception 'Permiso denegado'; end if;
  if p_user = auth.uid() then raise exception 'No puedes suspenderte a ti mismo'; end if;
  select r.rank into v_target_rank from public.users u join public.roles r on r.id = u.role_id where u.id = p_user;
  if v_target_rank >= 60 and not public.has_perm('manage_admins') then
    raise exception 'Solo un superadmin puede suspender a un administrador';
  end if;
  update public.users set suspended = p_suspended where id = p_user;
end $$;

create or replace function public.mod_resolve_report(p_report uuid, p_status text, p_resolution text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('moderate') then raise exception 'Permiso denegado'; end if;
  if p_status not in ('resolved','dismissed') then raise exception 'Estado inválido'; end if;
  update public.reports set status = p_status, resolution = p_resolution,
         resolved_by = auth.uid(), resolved_at = now()
   where id = p_report;
end $$;

-- Lista de usuarios para admin/moderador (con rol).
drop function if exists public.admin_list_users();
create or replace function public.admin_list_users()
returns table (id uuid, username text, display_name text, role_key text, xp int, level smallint,
               streak int, suspended boolean, created_at timestamptz, has_face boolean,
               mentor_id uuid, mentor_username text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.has_perm('moderate') or public.has_perm('manage_users')) then raise exception 'Permiso denegado'; end if;
  return query select u.id, u.username, u.display_name, r.key, u.xp, u.level,
         case when u.last_active_date >= public.mw_today() - 1 then u.streak else 0 end, u.suspended, u.created_at,
         exists (select 1 from public.face_templates f where f.user_id = u.id),
         m.mentor_id, mu.username
    from public.users u join public.roles r on r.id = u.role_id
    left join public.mentorships m on m.mentee_id = u.id
    left join public.users mu on mu.id = m.mentor_id
   order by u.created_at desc;
end $$;

-- ---------------------------------------------------------------------
--  Mentoría: cada persona puede tener un mentor. El mentor ve sus emociones,
--  actividades y progreso SOLO si su último consentimiento lo permite.
--  Los diarios nunca se comparten.
-- ---------------------------------------------------------------------
create table if not exists public.mentorships (
  mentee_id   uuid primary key references public.users(id) on delete cascade,
  mentor_id   uuid not null references public.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  check (mentee_id <> mentor_id)
);

-- Solo inserción: queda el rastro de cuándo se dio y cuándo se retiró el permiso.
create table if not exists public.mentor_consents (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.users(id) on delete cascade,
  allowed    boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists mentor_consents_user_idx on public.mentor_consents (user_id, created_at desc);
drop trigger if exists trg_consents_immutable on public.mentor_consents;
create trigger trg_consents_immutable before update or delete on public.mentor_consents
  for each row execute function public.prevent_ledger_mutation();

create or replace function public.consent_of(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select allowed from public.mentor_consents where user_id = p_user
                    order by created_at desc, id desc limit 1), false)
$$;

create or replace function public.set_mentor_consent(p_allowed boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  insert into public.mentor_consents (user_id, allowed) values (v_uid, p_allowed);
end $$;

create or replace function public.my_mentorship() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'mentor_username', (select u.username from public.mentorships m join public.users u on u.id = m.mentor_id where m.mentee_id = auth.uid()),
    'consent', public.consent_of(auth.uid()),
    'consent_at', (select created_at from public.mentor_consents where user_id = auth.uid() order by created_at desc, id desc limit 1))
$$;

drop function if exists public.mentor_list_mentees();
create or replace function public.mentor_list_mentees()
returns table (user_id uuid, username text, display_name text, assigned_at timestamptz, consent boolean,
               level smallint, xp int, streak int, last_emotion text, last_seen timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('mentor') then raise exception 'Permiso denegado'; end if;
  return query
  select u.id, u.username, u.display_name, m.assigned_at, c.ok,
         case when c.ok then u.level end, case when c.ok then u.xp end,
         case when c.ok then (case when u.last_active_date >= public.mw_today() - 1 then u.streak else 0 end) end,
         case when c.ok then (select e.key from public.detections d join public.emotions e on e.id = d.emotion_id
                               where d.user_id = u.id order by d.created_at desc limit 1) end,
         case when c.ok then (select max(d.created_at) from public.detections d where d.user_id = u.id) end
    from public.mentorships m
    join public.users u on u.id = m.mentee_id
    cross join lateral (select public.consent_of(u.id) ok) c
   where m.mentor_id = auth.uid()
   order by u.username;
end $$;

create or replace function public.mentor_get_mentee(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u public.users;
begin
  if not public.has_perm('mentor') then raise exception 'Permiso denegado'; end if;
  if not exists (select 1 from public.mentorships where mentee_id = p_user and mentor_id = auth.uid()) then
    raise exception 'Esta persona no está asignada a ti';
  end if;
  if not public.consent_of(p_user) then raise exception 'Esta persona no ha dado permiso para ver su historial'; end if;
  select * into u from public.users where id = p_user;
  return jsonb_build_object(
    'user_id', u.id, 'username', u.username, 'display_name', u.display_name,
    'level', u.level, 'xp', u.xp, 'longest_streak', u.longest_streak,
    'streak', case when u.last_active_date >= public.mw_today() - 1 then u.streak else 0 end,
    'detections', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'emotion', e.key, 'confidence', d.confidence,
                       'source', d.source, 'created_at', d.created_at) order by d.created_at desc), '[]')
                     from public.detections d join public.emotions e on e.id = d.emotion_id
                    where d.user_id = p_user and d.created_at > now() - interval '30 days'),
    'history', (select coalesce(jsonb_agg(to_jsonb(h) order by h.assigned_at desc), '[]') from (
                  select a.id assignment_id, ac.key activity, a.reason, a.created_at assigned_at,
                         e.key emotion, d.confidence, c.created_at completed_at, c.duration_seconds
                    from public.activity_assignments a
                    join public.activities ac on ac.id = a.activity_id
                    left join public.detections d on d.id = a.detection_id
                    left join public.emotions e on e.id = d.emotion_id
                    left join public.activity_completions c on c.assignment_id = a.id
                   where a.user_id = p_user order by a.created_at desc limit 30) h)
  );
end $$;

create or replace function public.admin_set_mentor(p_user uuid, p_mentor uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('manage_users') then raise exception 'Permiso denegado'; end if;
  if p_mentor is null then delete from public.mentorships where mentee_id = p_user; return; end if;
  if p_mentor = p_user then raise exception 'Nadie puede ser su propio orientador'; end if;
  if not exists (select 1 from public.users u join public.role_permissions rp on rp.role_id = u.role_id
                  where u.id = p_mentor and rp.perm = 'mentor') then
    raise exception 'Esa persona no tiene rol de orientador';
  end if;
  insert into public.mentorships (mentee_id, mentor_id) values (p_user, p_mentor)
  on conflict (mentee_id) do update set mentor_id = excluded.mentor_id, assigned_at = now();
end $$;

-- Sesiones de mentoría.
create or replace function public.mentor_claim_session(p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('mentor') then raise exception 'Permiso denegado'; end if;
  update public.mentor_sessions set mentor_id = auth.uid(), status = 'active'
   where id = p_session and status = 'requested' and mentee_id <> auth.uid();
  if not found then raise exception 'La sesión ya no está disponible'; end if;
  -- Si la persona aún no tiene mentor, quien toma su sesión pasa a acompañarla.
  insert into public.mentorships (mentee_id, mentor_id)
  select mentee_id, auth.uid() from public.mentor_sessions where id = p_session
  on conflict (mentee_id) do nothing;
end $$;

create or replace function public.mentor_complete_session(p_session uuid, p_feedback text, p_notes text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.mentor_sessions set status = 'completed', feedback = p_feedback, notes = p_notes, completed_at = now()
   where id = p_session and mentor_id = auth.uid() and status = 'active';
  if not found then raise exception 'Sesión no encontrada'; end if;
end $$;

-- Sesiones visibles para quien consulta, con nombres de usuario (los perfiles son privados por RLS).
create or replace function public.list_mentor_sessions()
returns table (id uuid, mentee_id uuid, mentee_username text, mentor_id uuid, mentor_username text,
               topic text, status text, notes text, feedback text, created_at timestamptz, completed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.mentee_id, me.username, s.mentor_id, mo.username, s.topic, s.status,
         case when s.mentor_id = auth.uid() then s.notes else null end,
         s.feedback, s.created_at, s.completed_at
    from public.mentor_sessions s
    join public.users me on me.id = s.mentee_id
    left join public.users mo on mo.id = s.mentor_id
   where s.mentee_id = auth.uid() or s.mentor_id = auth.uid()
      or (s.status = 'requested' and public.has_perm('mentor'))
   order by s.created_at desc
$$;

create or replace function public.mod_list_reports()
returns table (id uuid, reporter_username text, reported_user_id uuid, reported_username text,
               target_type text, target_id uuid, reason text, status text, resolution text,
               created_at timestamptz, resolved_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('moderate') then raise exception 'Permiso denegado'; end if;
  return query select r.id, rep.username, r.reported_user_id, tgt.username, r.target_type, r.target_id,
         r.reason, r.status, r.resolution, r.created_at, r.resolved_at
    from public.reports r
    join public.users rep on rep.id = r.reporter_id
    left join public.users tgt on tgt.id = r.reported_user_id
   order by (r.status = 'open') desc, r.created_at desc;
end $$;


-- ---------------------------------------------------------------------
--  5b. INICIO DE SESIÓN CON ROSTRO
--  La plantilla es un vector de 128 números (nunca una imagen) y solo se
--  guarda con consentimiento explícito. Nadie puede leer plantillas ajenas:
--  la comparación 1:N la hace la Edge Function `face-login` con service_role.
-- ---------------------------------------------------------------------

create table if not exists public.face_templates (
  user_id     uuid primary key references public.users(id) on delete cascade,
  descriptor  real[] not null check (array_length(descriptor, 1) = 128),
  consent_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.face_login_attempts (
  id         bigint generated always as identity primary key,
  ip         text not null,
  user_id    uuid references public.users(id) on delete cascade,
  success    boolean not null,
  distance   double precision,
  created_at timestamptz not null default now()
);
create index if not exists face_login_attempts_ip_idx on public.face_login_attempts (ip, created_at desc);

create or replace function public.face_distance(a real[], b real[]) returns double precision
language sql immutable parallel safe as $$
  select sqrt(sum((x - y) ^ 2)) from unnest(a, b) as t(x, y)
$$;

create or replace function public.valid_descriptor(d real[]) returns boolean
language sql immutable as $$
  select array_length(d, 1) = 128 and not exists (select 1 from unnest(d) x where x is null or x = 'NaN'::real or x in ('Infinity'::real, '-Infinity'::real))
$$;

-- Identificación 1:N (solo la usa la Edge Function con service_role).
create or replace function public.face_match(p_descriptor real[], p_threshold double precision default 0.45, p_exclude uuid default null)
returns table (user_id uuid, distance double precision)
language sql stable security definer set search_path = public as $$
  select m.user_id, m.d from (
    select ft.user_id, public.face_distance(ft.descriptor, p_descriptor) d
      from public.face_templates ft
      join public.users u on u.id = ft.user_id
     where ft.user_id is distinct from p_exclude
     order by 2 asc limit 1
  ) m where m.d <= p_threshold
$$;

-- Registrar / reemplazar el rostro propio (requiere consentimiento en la UI).
create or replace function public.enroll_face(p_descriptor real[])
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := public.assert_active_user(); v_hit record;
begin
  if not public.valid_descriptor(p_descriptor) then raise exception 'Plantilla facial inválida'; end if;
  if (select r.key from public.users u join public.roles r on r.id = u.role_id where u.id = v_uid) = 'guest' then
    raise exception 'Crea una cuenta para registrar tu rostro';
  end if;
  select * into v_hit from public.face_match(p_descriptor, 0.45, v_uid);
  if found then raise exception 'Ese rostro ya está registrado en otra cuenta. Si es un error, pide a un administrador que lo borre.'; end if;
  insert into public.face_templates (user_id, descriptor) values (v_uid, p_descriptor)
  on conflict (user_id) do update set descriptor = excluded.descriptor, consent_at = now(), updated_at = now();
end $$;

create or replace function public.delete_face() returns void
language sql security definer set search_path = public as $$
  delete from public.face_templates where user_id = auth.uid()
$$;

create or replace function public.admin_delete_face(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('manage_users') then raise exception 'Permiso denegado'; end if;
  delete from public.face_templates where user_id = p_user;
end $$;

-- Límite de intentos por IP (lo consulta la Edge Function).
create or replace function public.face_attempts_recent(p_ip text, p_minutes int default 15) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.face_login_attempts
   where ip = p_ip and not success and created_at > now() - make_interval(mins => p_minutes)
$$;

-- Perfil automático al registrarse en Supabase Auth.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_username text; v_base text; v_n int := 0;
begin
  v_base := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username',
                   split_part(coalesce(new.email, 'user'), '@', 1)), '[^a-zA-Z0-9_]', '', 'g'));
  if char_length(v_base) < 3 then v_base := v_base || 'user'; end if;
  v_base := left(v_base, 20);
  v_username := v_base;
  while exists (select 1 from public.users where username = v_username) loop
    v_n := v_n + 1; v_username := v_base || v_n;
  end loop;
  insert into public.users (id, username, display_name, role_id)
  values (new.id, v_username, coalesce(new.raw_user_meta_data->>'display_name', v_username),
          case when coalesce(new.is_anonymous, false) then 1 else 2 end);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
--  6. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table public.roles                enable row level security;
alter table public.emotions             enable row level security;
alter table public.activities           enable row level security;
alter table public.emotion_activity_map enable row level security;
alter table public.emotion_playlists    enable row level security;
alter table public.users                enable row level security;
alter table public.detections           enable row level security;
alter table public.activity_assignments enable row level security;
alter table public.activity_completions enable row level security;
alter table public.badges               enable row level security;
alter table public.user_badges          enable row level security;
alter table public.xp_ledger            enable row level security;
alter table public.journal_entries      enable row level security;
alter table public.mentor_sessions      enable row level security;
alter table public.reports              enable row level security;
alter table public.face_templates       enable row level security;
alter table public.face_login_attempts  enable row level security;
alter table public.role_permissions     enable row level security;
alter table public.mentorships          enable row level security;
alter table public.mentor_consents      enable row level security;

-- Catálogos: lectura pública.
drop policy if exists "catalog read" on public.roles;
create policy "catalog read" on public.roles for select using (true);
drop policy if exists "catalog read" on public.emotions;
create policy "catalog read" on public.emotions for select using (true);
drop policy if exists "catalog read" on public.activities;
create policy "catalog read" on public.activities for select using (true);
drop policy if exists "catalog read" on public.emotion_activity_map;
create policy "catalog read" on public.emotion_activity_map for select using (true);
drop policy if exists "catalog read" on public.emotion_playlists;
create policy "catalog read" on public.emotion_playlists for select using (true);
drop policy if exists "curator write" on public.emotion_playlists;
create policy "curator write" on public.emotion_playlists for update
  using (public.has_perm('curate')) with check (public.has_perm('curate'));

-- users: cada usuario ve su perfil; admin/superadmin ven todos.
drop policy if exists "own profile" on public.users;
create policy "own profile" on public.users for select
  using (id = auth.uid() or public.has_perm('manage_users'));
drop policy if exists "update own profile" on public.users;
create policy "update own profile" on public.users for update
  using (id = auth.uid()) with check (id = auth.uid());
-- Solo columnas no sensibles son editables por el propio usuario (xp, rol, etc. vía RPC).
revoke update on public.users from authenticated, anon;
grant update (username, display_name) on public.users to authenticated;

-- detections / assignments / completions: solo los propios (escritura vía RPC).
drop policy if exists "own rows" on public.detections;
create policy "own rows" on public.detections for select using (user_id = auth.uid());
drop policy if exists "own rows" on public.activity_assignments;
create policy "own rows" on public.activity_assignments for select using (user_id = auth.uid());
drop policy if exists "own rows" on public.activity_completions;
create policy "own rows" on public.activity_completions for select using (user_id = auth.uid());
drop policy if exists "own rows" on public.xp_ledger;
create policy "own rows" on public.xp_ledger for select using (user_id = auth.uid());
drop policy if exists "own rows" on public.user_badges;
create policy "own rows" on public.user_badges for select using (user_id = auth.uid());

-- journal: privado del usuario.
drop policy if exists "own journal" on public.journal_entries;
create policy "own journal" on public.journal_entries for select using (user_id = auth.uid());
drop policy if exists "delete own journal" on public.journal_entries;
create policy "delete own journal" on public.journal_entries for delete using (user_id = auth.uid());

-- badges: lectura pública; escritura solo admin/superadmin.
drop policy if exists "catalog read" on public.badges;
create policy "catalog read" on public.badges for select using (true);
drop policy if exists "admin write" on public.badges;
create policy "admin write" on public.badges for all
  using (public.has_perm('manage_badges')) with check (public.has_perm('manage_badges'));

-- mentor_sessions: el usuario ve las suyas; mentores ven solicitudes abiertas y las que atienden.
drop policy if exists "session read" on public.mentor_sessions;
create policy "session read" on public.mentor_sessions for select using (
  mentee_id = auth.uid() or mentor_id = auth.uid()
  or (status = 'requested' and public.has_perm('mentor'))
  or public.has_perm('manage_users'));
drop policy if exists "session request" on public.mentor_sessions;
create policy "session request" on public.mentor_sessions for insert
  with check (mentee_id = auth.uid() and status = 'requested' and mentor_id is null);
drop policy if exists "session cancel" on public.mentor_sessions;
create policy "session cancel" on public.mentor_sessions for update
  using (mentee_id = auth.uid() and status = 'requested')
  with check (mentee_id = auth.uid() and status = 'cancelled');

-- reports: cualquiera reporta; lectura/actualización solo moderator/admin/superadmin.
drop policy if exists "report create" on public.reports;
create policy "report create" on public.reports for insert
  with check (reporter_id = auth.uid() and status = 'open');
drop policy if exists "report read" on public.reports;
create policy "report read" on public.reports for select
  using (reporter_id = auth.uid() or public.has_perm('moderate'));
drop policy if exists "report update" on public.reports;
create policy "report update" on public.reports for update
  using (public.has_perm('moderate')) with check (public.has_perm('moderate'));

-- face_templates: cada quien sabe si tiene plantilla; nadie lee el vector por la API (ver grants).
drop policy if exists "own face" on public.face_templates;
create policy "own face" on public.face_templates for select using (user_id = auth.uid());
revoke all on public.face_templates from anon, authenticated;
grant select (user_id, consent_at, updated_at) on public.face_templates to authenticated;
-- face_login_attempts: sin políticas → inaccesible para clientes (solo service_role).
revoke all on public.face_login_attempts from anon, authenticated;

-- role_permissions: lectura pública (la UI decide qué mostrar); mentorships/consents solo vía RPC.
drop policy if exists "catalog read" on public.role_permissions;
create policy "catalog read" on public.role_permissions for select using (true);
revoke all on public.mentorships, public.mentor_consents from anon, authenticated;
drop function if exists public.has_role_at_least(text);

-- Permisos de ejecución de RPC.
revoke execute on function public.grant_xp(uuid, int, text, uuid, smallint, text) from public, anon, authenticated;
revoke execute on function public.evaluate_badges(uuid) from public, anon, authenticated;
grant execute on function public.record_detection(text, numeric, jsonb, text) to authenticated;
grant execute on function public.assign_activity(text, uuid) to authenticated;
grant execute on function public.complete_activity(uuid, int, int, text, text, text) to authenticated;
grant execute on function public.refresh_streak() to authenticated;
grant execute on function public.get_leaderboard(int) to authenticated;
grant execute on function public.get_analytics(int) to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
grant execute on function public.mod_set_suspended(uuid, boolean) to authenticated;
grant execute on function public.mod_resolve_report(uuid, text, text) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.mentor_claim_session(uuid) to authenticated;
grant execute on function public.mentor_complete_session(uuid, text, text) to authenticated;
grant execute on function public.list_mentor_sessions() to authenticated;
grant execute on function public.mod_list_reports() to authenticated;
grant execute on function public.set_mentor_consent(boolean) to authenticated;
grant execute on function public.my_mentorship() to authenticated;
grant execute on function public.mentor_list_mentees() to authenticated;
grant execute on function public.mentor_get_mentee(uuid) to authenticated;
grant execute on function public.admin_set_mentor(uuid, uuid) to authenticated;
revoke execute on function public.face_match(real[], double precision, uuid) from public, anon, authenticated;
revoke execute on function public.face_attempts_recent(text, int) from public, anon, authenticated;
grant execute on function public.face_match(real[], double precision, uuid) to service_role;
grant execute on function public.face_attempts_recent(text, int) to service_role;
grant execute on function public.enroll_face(real[]) to authenticated;
grant execute on function public.delete_face() to authenticated;
grant execute on function public.admin_delete_face(uuid) to authenticated;

-- ---------------------------------------------------------------------
--  7. PRIMER SUPERADMIN
--  Después de registrarte en la app, ejecuta (cambiando el usuario):
--    update public.users set role_id = 8 where username = 'tu_usuario';
-- ---------------------------------------------------------------------
