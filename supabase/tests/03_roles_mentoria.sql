-- Roles con permisos explícitos y mentoría con consentimiento. Ejecutar después de 01 y 02.
-- Los ERROR que imprime son pruebas negativas ESPERADAS.
\set ON_ERROR_STOP 0
reset role;
update public.users set suspended = false where username = 'johan';
insert into auth.users (id, email, raw_user_meta_data) values ('44444444-4444-4444-4444-444444444444','mod@x.com','{"username":"moderadora"}');
update public.users set role_id = 6 where username = 'moderadora'; -- Analista: revisa reportes y ve analítica
set role authenticated;

-- El mentor (mitzy1) acompaña a johan desde que tomó su sesión, pero sin permiso no ve nada.
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333', false);
select username, consent, level, last_emotion from public.mentor_list_mentees();
select public.mentor_get_mentee('22222222-2222-2222-2222-222222222222');
select * from public.mentorships;
-- Un mentor ya NO hereda permisos de moderador ni de analista.
select public.get_analytics(7);
select * from public.mod_list_reports();

-- johan da permiso
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', false);
select public.set_mentor_consent(true);
select public.my_mentorship() ->> 'mentor_username' as mi_mentor, public.my_mentorship() ->> 'consent' as permiso;
update public.mentor_consents set allowed = false;
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333', false);
select username, consent, level, last_emotion from public.mentor_list_mentees();
select jsonb_array_length(d -> 'detections') detecciones, jsonb_array_length(d -> 'history') actividades, d ? 'journal' as incluye_diario
  from (select public.mentor_get_mentee('22222222-2222-2222-2222-222222222222') d) x;
-- johan retira el permiso: se corta al instante
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222', false);
select public.set_mentor_consent(false);
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333', false);
select public.mentor_get_mentee('22222222-2222-2222-2222-222222222222');

-- Analista: revisa reportes y ve analítica, pero no administra; puede suspender a un orientador, no a un superadmin.
select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444', false);
select (public.get_analytics(7) ->> 'total_users')::int > 0 as ve_analitica;
select count(*) as reportes_visibles from public.mod_list_reports();
select public.admin_set_role('22222222-2222-2222-2222-222222222222','mentor');
select public.mod_set_suspended('33333333-3333-3333-3333-333333333333', true);
select public.mod_set_suspended('11111111-1111-1111-1111-111111111111', true);
select public.mod_set_suspended('33333333-3333-3333-3333-333333333333', false);

-- Superadmin asigna mentor
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
select public.admin_set_mentor('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333');
select public.admin_set_mentor('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222');
select username, role_key, mentor_username from public.admin_list_users() order by username;

-- Borrar una cuenta arrastra su XP, consentimientos y mentoría (los libros inmutables permiten la cascada)
reset role;
delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
select (select count(*) from public.xp_ledger where user_id = '22222222-2222-2222-2222-222222222222') xp_restante,
       (select count(*) from public.mentor_consents where user_id = '22222222-2222-2222-2222-222222222222') permisos_restantes;
