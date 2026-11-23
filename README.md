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
| demo@moodwave.app | Usuario (2 semanas de historial; compartió su historial con @orientador) |
| editor@moodwave.app | Editor de contenido |
| revisor@moodwave.app | Revisor de reportes |
| orientador@moodwave.app | Orientador |
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

## Publicar en GitHub Pages

El repositorio ya trae el workflow `.github/workflows/deploy-pages.yml`: en cada push a `main` corre las pruebas, compila con la base `/MoodWave/` y publica en **https://mitzylafragua12-ui.github.io/MoodWave/**.

Solo hay que activarlo una vez: **Settings → Pages → Build and deployment → Source: GitHub Actions**. El avance se ve en la pestaña **Actions**.

- Sin configurar nada se publica en **modo demo**.
- Para usar Supabase, agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en **Settings → Secrets and variables → Actions → Variables** y vuelve a ejecutar el workflow. Agrega también `https://mitzylafragua12-ui.github.io/MoodWave/` en las *Redirect URLs* de Supabase Auth.
- GitHub Pages no tiene reescrituras de rutas: el workflow copia `index.html` como `404.html` para que funcione abrir o recargar cualquier página interna.

## Desplegar en Vercel

1. Sube el repositorio a GitHub e impórtalo en Vercel (framework: **Vite**, se detecta solo).
2. En *Settings → Environment Variables* agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Cada push a `main` despliega automáticamente. `vercel.json` ya incluye las reescrituras para las rutas de la SPA.

Sin variables de entorno, el despliegue funciona en modo demo (útil para presentar).

---

## Entrar con el rostro

Retomado del prototipo anterior del equipo (es lo que se conservó de él) y adaptado a Supabase:

1. **Registro** (Perfil → *Entrar con mi rostro*): con consentimiento explícito se toman 7 capturas y se guarda su promedio: **128 números, nunca una imagen**. Si ese rostro ya pertenece a otra cuenta, se rechaza. Se puede borrar en cualquier momento (y un admin también puede borrarla).
2. **Identificación 1:N**: basta con mirar a la cámara y pulsar *Identificarme* (sin parpadeo, a pedido del equipo). Se promedian 5 capturas y se comparan con todas las plantillas (distancia euclidiana ≤ 0.45, más estricto que el 0.6 clásico).
   - **Modo Supabase**: el navegador envía solo el vector a la Edge Function `face-login`, que compara en la base de datos con `service_role`, aplica un límite de 10 intentos fallidos por IP cada 15 min y devuelve un token de un solo uso para abrir la sesión. **Ningún cliente puede leer plantillas ajenas** (ni la propia): la tabla `face_templates` no expone la columna del vector.
   - **Modo demo**: todo ocurre en el navegador, como en el prototipo.
3. El navegador recuerda que tiene un rostro registrado y abre directamente la pestaña *Mi rostro*.

**Límites (decirlos en la presentación):** es un método de **comodidad**, no de alta seguridad. Como no hay prueba de vida, una **foto o video de la persona** frente a la cámara podría servir para entrar; el umbral estricto (0.45) y el límite de intentos solo lo dificultan. La contraseña sigue existiendo como respaldo. Si más adelante se necesita más seguridad, se puede volver a agregar un reto (parpadeo, girar la cabeza) antes de identificar.

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
| Duración mínima | Meditación 60 s · Música 60 s · Minijuego 20 s · Diario ≥ 20 caracteres |

### Roles: cada uno ve lo suyo

Los nombres visibles son en español; por dentro se conservan las claves en inglés (`guest`, `listener`, `curator`, `moderator`, `mentor`…). Los roles **ya no son jerárquicos**: cada rol entra a su **propio panel** con solo sus herramientas de trabajo, y **todos** pueden usar además la parte de bienestar (detectar, actividades, progreso, ranking). Los permisos están en la tabla `role_permissions` y en `ROLE_PERMS` (`src/lib/catalog.ts`).

| Rol (clave interna) | Al entrar ve | Herramientas de trabajo |
|---|---|---|
| Visitante (`guest`) / Usuario (`listener`) | Su bienestar: nivel, racha, ánimo de la semana | — |
| Editor de contenido (`curator`) | Contenido por emoción (actividad, juego, playlist) | Contenido |
| Revisor de reportes (`moderator`) | Reportes por revisar | Reportes |
| Orientador (`mentor`) | Personas asignadas, solicitudes, sesiones | Mis acompañados |
| Analista (`analyst`) | Indicadores de 7 días | Analítica |
| Administrador (`admin`) | Cuentas, usuarios sin orientador, reportes y analítica | Administración, Reportes, Analítica |
| Superadmin (`superadmin`) | Todos los paneles | Todo, incluido gestionar administradores |

El rango solo se usa para proteger a los administradores: suspenderlos o cambiarles el rol requiere superadmin.

### Orientación con permiso

- Cada persona puede tener un orientador: lo asigna el administrador o queda asignado cuando un orientador toma su solicitud de sesión.
- En **Mi orientación → Privacidad** la persona decide si su orientador puede ver sus emociones, actividades y progreso. Puede retirarlo cuando quiera y el acceso se corta al instante.
- Los consentimientos se guardan como historial de solo inserción (`mentor_consents`): queda el rastro de cuándo se dio y cuándo se retiró.
- El orientador **nunca** ve el diario, ni con permiso.

### Flujo automático

Al detectar la emoción, la app muestra una cuenta de 3 segundos (que se puede cancelar) y lleva **directo a la actividad recomendada**, que **arranca sola**: la meditación empieza a contar, el juego hace su cuenta regresiva y el diario abre con el cursor listo. Desde la actividad se puede pulsar *Cambiar actividad*. La música de Spotify es la excepción: los navegadores no permiten reproducir sin un toque.

### Un juego por emoción

| Emoción | Juego | Idea |
|---|---|---|
| 😊 Feliz | ⭐ Lluvia de estrellas | Atrapar estrellas con una canasta: aprovechar la energía |
| 😢 Triste | 🌸 Jardín de luz | Plantar flores con calma, con mensajes amables |
| 😠 Enojo | 🫧 Burbujas de calma | Reventar burbujas con lo que molesta: soltar tensión |
| 😨 Miedo | 🗼 Faro en calma | Mantener presionado al inhalar y soltar al exhalar |
| 🤢 Disgusto | 🧽 Ventana limpia | Limpiar una ventana sucia y descubrir un paisaje |
| 😮 Sorpresa | 🎁 Memoria sorpresa | Encontrar parejas: de la sorpresa a la atención |
| 😐 Neutral | 🎯 Encuentra el distinto | Reto de atención que sube de nivel |

Si el minijuego se elige sin detección, se muestra un selector con los 7. Cada partida guarda qué juego se jugó (`activity_completions.game_key`). Los juegos están en `src/pages/activities/games/`.

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
| Casos de uso de mentor | `pages/Mentees.tsx`, `pages/MenteeDetail.tsx`, `pages/Mentorship.tsx`, `mentorships`, `mentor_consents` |
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
    faceDetection.ts carga de modelos, detección y descriptores faciales
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
| `npm test` | Pruebas unitarias de gamificación y de comparación de rostros (Vitest) |

Para probar el esquema SQL en un PostgreSQL 15+ local:

```bash
psql -d moodwave_test -f supabase/tests/00_stub_supabase.sql -f supabase/schema.sql -f supabase/tests/01_flujo.sql -f supabase/tests/02_rostro.sql -f supabase/tests/03_roles_mentoria.sql
```

---

**Aviso:** MoodWave no sustituye la atención profesional en salud mental. En México, Línea de la Vida: 800 911 2000 (24 h).
