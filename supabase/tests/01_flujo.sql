-- Prueba del flujo completo: detección → asignación → completado → XP (tope 200/día) → badges → roles.
-- Uso: psql -d <db> -f 00_stub_supabase.sql -f ../schema.sql -f 01_flujo.sql
-- Los 8 ERROR que imprime son pruebas negativas ESPERADAS (validaciones, RLS, permisos, cuenta suspendida).
\set ON_ERROR_STOP 1
insert into auth.users (id, email, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','mitzy@x.com','{"username":"mitzy"}'),
 ('22222222-2222-2222-2222-222222222222','johan@x.com','{}'),
 ('33333333-3333-3333-3333-333333333333','mitzy2@x.com','{"username":"mitzy"}');
select username, role_id from public.users order by username;
update public.users set role_id = 8 where username='mitzy';

set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', false);
select count(*) as visible_users from public.users;  -- 1
select public.record_detection('sad', 0.87, '{"sad":0.87}'::jsonb) as det \gset
select :'det'::jsonb ->> 'xp_granted' as checkin_xp, jsonb_array_length((:'det'::jsonb)->'new_badges') as nb;
select a.key from public.activity_assignments aa join public.activities a on a.id=aa.activity_id; -- journaling
-- journaling too short must fail
\set ON_ERROR_STOP 0
select public.complete_activity((:'det'::jsonb->>'assignment_id')::uuid, 10, null, 'corto');
-- direct insert to ledger must fail
insert into public.xp_ledger (user_id, amount, reason) values ('22222222-2222-2222-2222-222222222222', 999, 'activity');
update public.users set xp = 99999 where id = auth.uid();
\set ON_ERROR_STOP 1
select public.complete_activity((:'det'::jsonb->>'assignment_id')::uuid, 120, null, 'Hoy me sentí triste por los exámenes, pero escribirlo ayuda.', 'prompt') as r;
\set ON_ERROR_STOP 0
select public.complete_activity((:'det'::jsonb->>'assignment_id')::uuid, 120, null, 'Hoy me sentí triste por los exámenes, pero escribirlo ayuda.');
select public.complete_activity(public.assign_activity('meditation'), 10);
\set ON_ERROR_STOP 1
-- spam activities to hit daily cap
select (public.complete_activity(public.assign_activity('meditation'), 90)) ->> 'xp_granted' g1;
select (public.complete_activity(public.assign_activity('minigame'), 40, 12)) ->> 'xp_granted' g2;
select (public.complete_activity(public.assign_activity('music'), 70)) ->> 'xp_granted' g3;
select (public.complete_activity(public.assign_activity('meditation'), 90)) as g4;
select (public.complete_activity(public.assign_activity('meditation'), 90)) ->> 'xp_granted' g5;
select xp, level, streak, longest_streak from public.users where id = auth.uid();
select sum(amount) ledger_total from public.xp_ledger;
select b.key from public.user_badges ub join public.badges b on b.id = ub.badge_id order by b.id;
select * from public.get_leaderboard();
\set ON_ERROR_STOP 0
select public.get_analytics();
select public.admin_set_role('11111111-1111-1111-1111-111111111111','listener');
\set ON_ERROR_STOP 1
insert into public.mentor_sessions (mentee_id, topic) values (auth.uid(), 'Ansiedad por exámenes');
insert into public.reports (reporter_id, reported_user_id, target_type, reason) values (auth.uid(), '33333333-3333-3333-3333-333333333333','user','Nombre ofensivo');
-- superadmin
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
select count(*) as visible_users_admin from public.users;
select public.admin_set_role('33333333-3333-3333-3333-333333333333','mentor');
select public.get_analytics(7) -> 'activities' as act;
select reporter_username, reported_username, status from public.mod_list_reports();
select public.mod_set_suspended('22222222-2222-2222-2222-222222222222', true);
select username, role_key, suspended from public.admin_list_users();
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333', false);
select id, mentee_username, status from public.list_mentor_sessions() \gset s_
select public.mentor_claim_session(:'s_id');
select public.mentor_complete_session(:'s_id', 'Buen trabajo, sigue respirando.', 'nota privada');
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', false);
select mentor_username, status, feedback, notes from public.list_mentor_sessions();
\set ON_ERROR_STOP 0
select public.record_detection('happy', 0.9);
