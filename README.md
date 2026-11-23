# MoodWave — Ride your emotions

Plataforma web de bienestar emocional: entras con tu rostro (o contraseña), detecta tu estado de ánimo con la cámara (face-api.js, 100 % en el navegador), te recomienda una actividad de autocuidado (minijuego, diario, meditación guiada o música de Spotify) y premia tu constancia con XP, 10 niveles, logros y rachas.

Proyecto de la asignatura *Arquitectura de Software* — Ing. en Desarrollo y Gestión de Software, Universidad Tecnológica de Nezahualcóyotl, grupo 701-V.

---

## Inicio rápido (modo demo, sin configurar nada)

```bash
npm install
```

```bash
npm run dev
```

Abre http://localhost:5173. Si no hay credenciales de Supabase, la app arranca en **modo demo**: los datos se guardan en el navegador (localStorage) y vienen precargadas cuentas de ejemplo para cada rol (contraseña `moodwave123`):

| Cuenta | Rol |
|---|---|
| demo@moodwave.app | Listener (usuario con 2 semanas de historial) |
| curador@moodwave.app | Curador |
| moderador@moodwave.app | Moderador |
| mentor@moodwave.app | Mentor |
| analista@moodwave.app | Analista |
| admin@moodwave.app | Administrador |
| superadmin@moodwave.app | Superadmin |

En la pantalla de login hay botones para entrar con cada una. El modo demo replica exactamente las mismas reglas de negocio que la base de datos real.

> La cámara solo funciona en `localhost` o con HTTPS (requisito del navegador).

---

## Conectar Supabase (producción)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: pega y ejecuta todo [`supabase/schema.sql`](supabase/schema.sql). Crea tablas, catálogos, funciones, triggers y políticas RLS. Puedes ejecutarlo de nuevo sin problema (es idempotente).
3. **Project Settings → API**: copia la URL y la `anon public key` a un archivo `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. (Opcional) **Authentication → Sign In / Providers**: activa *Anonymous sign-ins* para el botón "Continuar como invitado". Si quieres registro sin confirmar correo, desactiva *Confirm email*.
5. **Authentication → URL Configuration**: agrega tu dominio de Vercel en *Site URL* y *Redirect URLs*.
6. **Inicio de sesión con rostro**: despliega la Edge Function (requiere la [CLI de Supabase](https://supabase.com/docs/guides/cli)):
   ```bash
   supabase login
   ```
   ```bash
   supabase functions deploy face-login --project-ref TU_PROJECT_REF
   ```
   `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` se inyectan solas; no hay que configurar secretos.
7. Regístrate en la app y conviértete en superadmin desde el SQL Editor:
   ```sql
   update public.users set role_id = 8 where username = 'tu_usuario';
   ```

## Desplegar en Vercel

1. Sube el repositorio a GitHub e impórtalo en Vercel (framework: **Vite**, se detecta solo).
2. En *Settings → Environment Variables* agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Cada push a `main` despliega automáticamente. `vercel.json` ya incluye las reescrituras para las rutas de la SPA.

Sin variables de entorno, el despliegue funciona en modo demo (útil para presentar).

---

## Entrar con el rostro

Retomado del prototipo anterior del equipo (es lo que se conservó de él) y adaptado a Supabase:

1. **Registro** (Perfil → *Entrar con mi rostro*): con consentimiento explícito se toman 7 capturas y se guarda su promedio: **128 números, nunca una imagen**. Si ese rostro ya pertenece a otra cuenta, se rechaza. Se puede borrar en cualquier momento (y un admin también puede borrarla).
2. **Prueba de vida**: al pulsar *Identificarme* hay que **parpadear** (abierto → cerrado → abierto, medido con el *Eye Aspect Ratio*). El umbral es relativo al ojo abierto de cada persona (80 % de su máximo), para que funcione con lentes u ojos rasgados. Una foto fija no pasa.
3. **Identificación 1:N**: se promedian 5 capturas y se comparan con todas las plantillas (distancia euclidiana ≤ 0.45, más estricto que el 0.6 clásico).
   - **Modo Supabase**: el navegador envía solo el vector a la Edge Function `face-login`, que compara en la base de datos con `service_role`, aplica un límite de 10 intentos fallidos por IP cada 15 min y devuelve un token de un solo uso para abrir la sesión. **Ningún cliente puede leer plantillas ajenas** (ni la propia): la tabla `face_templates` no expone la columna del vector.
   - **Modo demo**: todo ocurre en el navegador, como en el prototipo.
4. El navegador recuerda que tiene un rostro registrado y abre directamente la pestaña *Mi rostro*.

**Límites (decirlos en la presentación):** es un método de **comodidad**, no de alta seguridad. El parpadeo frena una foto, pero no un video de la persona; para control de acceso serio haría falta un reto aleatorio, cámara de profundidad o análisis de textura. Además, la prueba de vida corre en el navegador, así que alguien con conocimientos técnicos que obtenga una foto de la víctima podría calcular el vector y enviarlo directamente; el límite de intentos y el umbral estricto lo dificultan, y la contraseña sigue existiendo como respaldo. La rapidez del parpadeo depende del equipo: con aceleración gráfica va a 20–30 fps; en equipos muy lentos conviene parpadear despacio.

## Arquitectura

```
┌──────────────────────── Navegador (React + Vite, PWA) ────────────────────────┐
│  Páginas / componentes  →  lib/api (contrato Api)  →  supabaseApi | demoApi   │
│  face-api.js (TinyFaceDetector + FaceExpressionNet) — los fotogramas nunca     │
│  salen del dispositivo; solo se envía la emoción y las probabilidades          │
└───────────────────────────────────────┬───────────────────────────────────────┘
                                        │ HTTPS (PostgREST + RPC)
┌───────────────────────── Supabase ────┴──────────────────────────────────────┐
│ Auth  ·  PostgreSQL con RLS  ·  funciones RPC SECURITY DEFINER (lógica de XP)  │
└──────────────────────────────────────────────────────────────────────────────┘
                  Spotify (reproductor embebido por playlist curada)
```

**Proceso de negocio por etapas** (cada una en su propia tabla, auditable):

1. `detections` — la cámara detectó una emoción (con confianza y probabilidades).
2. `activity_assignments` — qué actividad recomendó el sistema (o eligió el usuario).
3. `activity_completions` — si la actividad se completó y cuánto duró.
4. `xp_ledger` / `user_badges` — cada punto de XP y logro otorgado, con su motivo.

El cliente **no puede escribir XP**: `xp_ledger` no tiene política de inserción y el perfil solo permite editar `username` y `display_name`. Toda la lógica vive en las funciones `record_detection`, `assign_activity` y `complete_activity` del servidor, que validan duración mínima, tope diario, racha y logros.

### Reglas de gamificación

| Regla | Valor |
|---|---|
| XP por actividad | Minijuego 30 · Diario 40 · Meditación 50 · Música 25 |
| Check-in diario (primera detección del día) | 10 XP |
| Tope diario (RNF-04) | 200 XP por usuario (incluye logros) |
| Niveles | 10: 0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200 XP |
| Racha | Días consecutivos con al menos una actividad completada (zona America/Mexico_City) |
| Logros | 14 predefinidos; el administrador puede crear más desde la app |
| Duración mínima | Meditación 60 s · Música 60 s · Minijuego 30 s · Diario ≥ 20 caracteres |

### Roles (jerárquicos)

| Rango | Rol | Puede |
|---|---|---|
| 0 | guest | Probar la app (no aparece en el ranking) |
| 10 | listener | Detectar, hacer actividades, ganar XP, solicitar mentoría, reportar |
| 20 | curator | + Editar la playlist de Spotify de cada emoción |
| 30 | moderator | + Revisar reportes, suspender y reactivar cuentas |
| 40 | mentor | + Tomar solicitudes de mentoría y dar retroalimentación |
| 50 | analyst | + Dashboard analítico agregado |
| 60 | admin | + Gestionar usuarios, roles (hasta mentor/analista) y badges |
| 70 | superadmin | + Asignar administradores |

---

## Trazabilidad con el documento del proyecto

| Requerimiento / Historia | Dónde se implementa |
|---|---|
| RF-01 / HU-02 Detección en tiempo real | `pages/Detect.tsx`, `lib/faceDetection.ts` (promedio móvil de 8 lecturas; lectura estable en ~1–2 s una vez cargado el modelo) |
| RF-02 / HU-03 Recomendación automática (≥ 3 opciones) | `emotion_activity_map` + `record_detection`; `pages/Activities.tsx` muestra las 4 ordenadas |
| RF-03 / HU-06 Historial y gráfica semanal | `pages/History.tsx`, `components/WeeklyMoodChart.tsx` |
| RF-04 / HU-04 XP, niveles, badges, rachas | `complete_activity`, `evaluate_badges`, `pages/Profile.tsx` |
| RF-05 Gestión de usuarios, roles y reportes | `pages/Admin.tsx`, `pages/Moderation.tsx` |
| HU-01 Registro e inicio de sesión | `pages/Login.tsx`, `pages/Register.tsx` (Supabase Auth) |
| Inicio de sesión con rostro | `components/FaceLoginPanel.tsx`, `components/FaceEnrollCard.tsx`, `lib/faceAuth.ts`, `supabase/functions/face-login` |
| HU-05 Playlists de Spotify por emoción | `pages/activities/Music.tsx`, `pages/Curation.tsx` |
| RNF-01 Procesamiento 100 % en cliente | face-api.js con modelos servidos desde `/models` |
| RNF-02 Auth + RLS | Sección 6 de `schema.sql` |
| RNF-03 Navegador moderno, responsivo, PWA | Diseño móvil con barra inferior, `vite-plugin-pwa` (instalable y offline) |
| RNF-04 Máx. 200 XP/día | `grant_xp` / `cappedGrant` |
| Casos de uso de mentor | `pages/Mentorship.tsx`, `mentor_sessions` |
| Dashboard analítico | `pages/Analytics.tsx`, `get_analytics` |

### Diferencias respecto al documento v2 (para actualizarlo)

- **face-api.js** se usa mediante su fork mantenido `@vladmandic/face-api` (misma API; el original ya no recibe mantenimiento ni funciona con las versiones actuales de TensorFlow.js).
- **Spotify**: se usa el reproductor embebido (*Spotify Embed*) con playlists curadas por emoción. Spotify ya no permite a apps nuevas leer sus playlists editoriales por Web API y el SDK de reproducción exige Premium; el embed funciona para todos sin credenciales. Los curadores pegan el enlace de la playlist.
- Tablas nuevas: `emotion_activity_map` (motor de recomendación configurable), `emotion_playlists` (curaduría), `face_templates` y `face_login_attempts` (inicio de sesión con rostro).
- Se agregó selección manual de emoción como alternativa accesible cuando no hay cámara (queda marcada como `source = 'manual'`).
- El **Anexo A** del documento puede ser directamente `supabase/schema.sql`.
- Fuera de alcance de esta entrega (fase 6 del cronograma): IA generativa con RAG.

---

## Estructura

```
src/
  lib/
    api/            contrato Api + implementación Supabase y demo
    catalog.ts      emociones, actividades, roles, badges (espejo del SQL)
    gamification.ts niveles, tope diario, rachas (con pruebas)
    faceDetection.ts carga de modelos, detección, parpadeo y descriptores
    faceAuth.ts     comparación de rostros y prueba de vida (con pruebas)
  pages/            una página por ruta; activities/ con las 4 actividades
  components/       layout, gráficas, modales
supabase/
  schema.sql        base de datos completa (Anexo A)
  functions/face-login/  Edge Function que identifica el rostro y abre la sesión
  tests/            prueba del esquema en PostgreSQL local
scripts/copy-models.mjs  copia los modelos de face-api a public/models al instalar
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Verifica tipos y genera `dist/` |
| `npm run preview` | Sirve el build de producción |
| `npm test` | Pruebas unitarias de gamificación y de comparación de rostros/parpadeo (Vitest) |

Para probar el esquema SQL en un PostgreSQL 15+ local:

```bash
psql -d moodwave_test -f supabase/tests/00_stub_supabase.sql -f supabase/schema.sql -f supabase/tests/01_flujo.sql -f supabase/tests/02_rostro.sql
```

---

**Aviso:** MoodWave no sustituye la atención profesional en salud mental. En México, Línea de la Vida: 800 911 2000 (24 h).
