-- Prueba del inicio de sesión con rostro. Ejecutar después de 01_flujo.sql.
-- Los ERROR que imprime son pruebas negativas ESPERADAS.
\set ON_ERROR_STOP 0
reset role;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
set role authenticated;
-- mitzy (superadmin) registra su rostro
select public.enroll_face(array_fill(0.05::real, array[128]));
-- plantilla inválida
select public.enroll_face(array_fill(0.05::real, array[127]));
-- ve que tiene plantilla, pero NO puede leer el vector
select user_id is not null as tengo_rostro from public.face_templates;
select descriptor from public.face_templates;
-- no puede llamar la identificación 1:N
select * from public.face_match(array_fill(0.05::real, array[128]));
-- otra cuenta intenta registrar el mismo rostro
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333', false);
select public.enroll_face(array_fill(0.051::real, array[128]));
select public.enroll_face(array_fill(0.5::real, array[128]));
-- service_role (Edge Function) identifica
reset role; set role service_role;
select user_id, round(distance::numeric, 4) as distancia from public.face_match(array_fill(0.052::real, array[128]));
select count(*) as sin_coincidencia from public.face_match(array_fill(0.3::real, array[128]));
insert into public.face_login_attempts (ip, success) values ('1.2.3.4', false), ('1.2.3.4', false);
select public.face_attempts_recent('1.2.3.4') as intentos_fallidos;
-- admin borra un rostro; el usuario borra el suyo
reset role; set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111', false);
select public.admin_delete_face('33333333-3333-3333-3333-333333333333');
select public.delete_face();
reset role;
select count(*) as plantillas_restantes from public.face_templates;
select username, has_face from public.users u left join lateral (select true has_face from public.face_templates f where f.user_id = u.id) x on true order by 1;
