-- Simula lo mínimo de Supabase (roles, auth.users, auth.uid()) para probar schema.sql en un PostgreSQL local.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}', is_anonymous boolean default false);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
-- Igual que los proyectos NUEVOS de Supabase: las tablas que crea postgres en public NO reciben
-- privilegios de lectura/escritura para anon/authenticated/service_role (solo Dxtm). Por eso
-- schema.sql los otorga explícitamente.
alter default privileges in schema public grant delete, truncate, references, trigger on tables to anon, authenticated, service_role;
grant usage on schema public to service_role;
