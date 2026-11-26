# MoodWave — Ride your emotions

Plataforma web de bienestar emocional: entras con tu rostro (o contraseña), detecta tu estado de ánimo con la cámara (face-api.js, 100 % en el navegador), te recomienda una actividad de autocuidado (minijuego, diario, meditación guiada o música de Spotify) y premia tu constancia con XP, 10 niveles, logros y rachas.

Proyecto de la asignatura *Arquitectura de Software* — Ing. en Desarrollo y Gestión de Software, Universidad Tecnológica de Nezahualcóyotl, grupo 701-V.

---

## Documentación del proyecto

En [`docs/`](docs/) están los entregables académicos:

- **[`MoodWave_Documentacion.docx`](docs/MoodWave_Documentacion.docx)**: documento Word de 104 páginas con los **41 entregables** en orden: planteamiento, requisitos, historias de usuario, backlog, sprints, mapa del sitio, diagramas de flujo, wireframes, guía de estilos, arquitectura, modelo ER, diccionario de datos (generado de la base real), seguridad, pruebas, errores, evidencias por rol, manuales técnico y de usuario, conclusiones y mejoras. El Anexo A es `schema.sql` completo. La portada tiene campos `[entre corchetes]` para llenar con los datos del equipo.
- **[`video/MoodWave-promo.mp4`](docs/video/MoodWave-promo.mp4)**: video promocional de 1 min 5 s (1080p) grabado de la app real.
- **[`img/`](docs/img/)**: diagramas, wireframes y capturas usados en el documento.

## Puesta en marcha

### Opción recomendada: Docker (en tu computadora)

La app corre en un contenedor (nginx) en tu computadora, **con HTTPS para la red local**; la base de datos sigue en Supabase, así que necesitas internet. Requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop/) abierto.

```bash
git clone https://github.com/mitzylafragua12-ui/MoodWave.git
```
```bash
cd MoodWave
```

Luego arranca con el script de tu sistema. Detecta la IP de tu computadora en la red, la mete en el certificado, construye la imagen y te dice qué direcciones abrir:

- **Windows** (PowerShell):
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\start.ps1
  ```
- **macOS / Linux**:
  ```bash
  ./start.sh
  ```

Al terminar verás algo así:

```
En esta computadora:   http://localhost:8080
En la red local:       https://192.168.1.50:8443
Certificado raíz:      http://192.168.1.50:8080/moodwave-ca.crt
```

La primera vez tarda unos minutos: instala dependencias, corre las pruebas y compila dentro del contenedor. La imagen pesa unos 295 MB porque usa nginx sobre Debian, que ya trae `openssl` para crear los certificados.

| Qué quieres hacer | Comando |
|---|---|
| Ver si está corriendo | `docker compose ps` (debe decir `healthy`) |
| Ver los registros | `docker compose logs -f` |
| Detenerla | `docker compose down` |
| Actualizar tras `git pull` | volver a ejecutar `start.ps1` / `start.sh` |
| Otros puertos | `MOODWAVE_PORT=3000 MOODWAVE_HTTPS_PORT=3443 ./start.sh` (PowerShell: `$env:MOODWAVE_PORT=3000; $env:MOODWAVE_HTTPS_PORT=3443; .\start.ps1`) |

Sin los scripts también funciona `docker compose up -d --build`. En ese caso el certificado cubre `localhost` y la última IP que guardó el script en `.env`.

#### HTTPS en la red local (para usar la cámara desde el celular)

Los navegadores solo abren la cámara en `localhost` o con HTTPS. Para que un celular o una tablet de la misma red Wi-Fi pueda usar *Detectar* y *Entrar con el rostro*, el contenedor sirve también **https://TU-IP:8443** con un certificado propio:

- La primera vez crea una **autoridad certificadora local** («MoodWave Local CA»). Vale 10 años, se guarda en el volumen `moodwave-certs` y no sale de tu computadora.
- Con ella firma el certificado del servidor para `localhost`, `127.0.0.1` y las IP o nombres de `MOODWAVE_HOSTS`. Si cambia la IP, el script lo detecta y el certificado se vuelve a firmar **con la misma autoridad**, así que no hay que reinstalar nada en los dispositivos.

**Instala el certificado raíz una vez en cada dispositivo.** Descárgalo desde ese dispositivo en `http://TU-IP:8080/moodwave-ca.crt`. Si no lo instalas, el navegador muestra «La conexión no es privada» y la cámara puede no abrir.

| Dispositivo | Cómo instalarlo |
|---|---|
| **Android** | Ajustes → Seguridad → Cifrado y credenciales → Instalar un certificado → *Certificado de CA* → elige `MoodWave-CA.crt` (el menú cambia un poco según la marca) |
| **iPhone / iPad** | Ábrelo en **Safari** → Permitir → Ajustes → *Perfil descargado* → Instalar. Después: Ajustes → General → Información → **Ajustes de confianza de certificados** → activa «MoodWave Local CA» (sin este paso no funciona) |
| **Windows** | Doble clic en el archivo → Instalar certificado → Equipo local → «Colocar todos los certificados en el siguiente almacén» → **Entidades de certificación raíz de confianza**. Reinicia el navegador. Firefox usa su propio almacén: Ajustes → Privacidad → Ver certificados → Autoridades → Importar |
| **macOS** | Doble clic → se abre *Acceso a Llaveros* (llavero *Sistema*) → doble clic en «MoodWave Local CA» → Confiar → **Confiar siempre** |

Después abre `https://TU-IP:8443` en el dispositivo.

**Si no abre desde el celular:**

- Los dos deben estar en la misma red Wi-Fi. Las redes de invitados o de escuela a veces aíslan a los dispositivos entre sí.
- **Firewall de Windows:** la primera vez Windows pregunta si deja pasar a Docker; acepta en *redes privadas*. Si no preguntó, en PowerShell como administrador:
  ```powershell
  New-NetFirewallRule -DisplayName "MoodWave" -Direction Inbound -Protocol TCP -LocalPort 8080,8443 -Action Allow -Profile Private
  ```
- Si el script eligió una IP equivocada (por ejemplo la de una VPN), indícasela. Queda guardada en `.env`, y admite varias separadas por comas o nombres (`192.168.1.50,mi-pc.local`):
  ```powershell
  $env:MOODWAVE_HOSTS="192.168.1.50"; .\start.ps1
  ```
  ```bash
  MOODWAVE_HOSTS=192.168.1.50 ./start.sh
  ```
- Supabase ya acepta como dirección de regreso `https://localhost:8443` y `https://<IP privada>:8443` (rangos 192.168, 10 y 172). Si usas otro puerto o un nombre, agrégalo en *Authentication → URL Configuration → Redirect URLs*.
- Para crear una autoridad nueva (por ejemplo si se filtró la clave), borra el volumen con `docker compose down -v` y vuelve a instalar el certificado en los dispositivos.

**Otras opciones:**

- **Otro proyecto de Supabase sin recompilar:** agrega `SUPABASE_URL` y `SUPABASE_ANON_KEY` a `.env` (los scripts conservan las demás líneas). Al arrancar, el contenedor genera `config.js` con esos valores; si no los defines, usa los de `.env.production`.
- **Archivos:** [`Dockerfile`](Dockerfile) (compila con Node 22 y sirve con nginx), [`docker-compose.yml`](docker-compose.yml), [`start.sh`](start.sh) / [`start.ps1`](start.ps1) y [`docker/`](docker/), que tiene la configuración de nginx (puertos 80 y 443, HTTP/2), los encabezados de seguridad, la creación de certificados (`30-moodwave-certs.sh`) y la de `config.js`.

MoodWave trabaja **solo con la base de datos real** (Supabase): las cuentas se crean desde la pantalla *Regístrate*. Ya no existe modo demo ni cuentas de ejemplo.

> **Estado actual:** ya está conectado al proyecto Supabase `mujauhrhgeuzbdxyqiju` (región us-east-2): esquema instalado, *Confirm email* desactivado, visitantes habilitados, URLs de GitHub Pages autorizadas y la función `face-login` desplegada. La URL y la clave pública están en `.env.production`. Los pasos de abajo sirven para reinstalar o para montarlo en otro proyecto.

### 1. Base de datos (una sola vez)

1. Crea un proyecto en [supabase.com](https://supabase.com) (el plan gratuito alcanza).
2. **SQL Editor → New query**: pega y ejecuta todo [`supabase/schema.sql`](supabase/schema.sql). Crea tablas, catálogos, funciones, triggers, políticas RLS y los privilegios de tabla (los proyectos nuevos de Supabase ya no los dan solos). Se puede volver a ejecutar sin problema.
3. **Authentication → Sign In / Providers → Email**:
   - Para el proyecto escolar conviene **desactivar *Confirm email***: el correo gratuito de Supabase solo envía unos pocos mensajes por hora y los registros se quedarían esperando la confirmación. Si lo dejan activo, cada persona debe abrir el enlace de su correo antes de entrar.
   - (Opcional) Activa **Anonymous sign-ins** para el botón *Continuar como visitante*.
4. **Authentication → URL Configuration**: en *Site URL* y *Redirect URLs* agrega `https://mitzylafragua12-ui.github.io/MoodWave/` (y `http://localhost:5173` para trabajar en local).
5. **Inicio de sesión con rostro** — Edge Function `face-login`. Desde el panel: **Edge Functions → Deploy a new function → Via Editor**, nombre `face-login`, pega el contenido de [`supabase/functions/face-login/index.ts`](supabase/functions/face-login/index.ts) y despliega. O con la [CLI](https://supabase.com/docs/guides/cli):
   ```bash
   supabase functions deploy face-login --project-ref TU_PROJECT_REF
   ```
   `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` se inyectan solas.
6. Regístrate en la app y conviértete en superadmin desde el SQL Editor (después ya puedes asignar roles desde *Administración*):
   ```sql
   update public.users set role_id = 8 where username = 'tu_usuario';
   ```

### 2. Publicar en GitHub Pages (sigue activo además de Docker)

1. La URL y la clave *anon public* del proyecto (**Project Settings → API**) van en [`.env.production`](.env.production). La clave anon es pública por diseño (viaja en el navegador); lo que protege los datos son las políticas RLS. **Nunca** pongas ahí la clave *service_role*.
2. **Settings → Pages → Source: GitHub Actions** (ya hecho).
3. En cada push a `main` el workflow corre las pruebas, compila con la base `/MoodWave/` y publica en **https://mitzylafragua12-ui.github.io/MoodWave/**. Para publicar sin cambios de código: **Actions → Publicar en GitHub Pages → Run workflow**.
4. (Opcional) Si defines las variables de repositorio `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (**Settings → Secrets and variables → Actions → Variables**), tienen prioridad sobre `.env.production`.

GitHub Pages no tiene reescrituras de rutas: el workflow copia `index.html` como `404.html` para que se pueda abrir o recargar cualquier página interna.

### 3. Trabajar en local

```bash
npm install
```

Copia `.env.example` a `.env.local`, llena las mismas dos variables y ejecuta:

```bash
npm run dev
```

Abre http://localhost:5173. Si faltan las variables, la app muestra una pantalla que explica cómo configurarlas.

> La cámara solo funciona en `localhost` o con HTTPS (requisito del navegador). Para probar desde el celular usa Docker con HTTPS (arriba).

---

## Idioma y tema

- **Perfil → Configuración**: idioma (**Español, English, Português, Français, Deutsch, Italiano**) y tema (**Oscuro / Claro / Según el sistema**). Se guardan en la cuenta (`users.language`, `users.theme`) y se aplican en todos los dispositivos; en las pantallas de entrada hay un selector rápido que se recuerda en el navegador.
- Traducciones en `src/i18n/` (`en.ts`, `pt.ts`, `fr.ts`, `de.ts`, `it.ts`): la clave es el texto en español tal como aparece en el código (`t('Hola, {name}', { name })`). Si falta una traducción se muestra el español. La prueba `src/i18n/i18n.test.ts` falla si a algún idioma le falta un texto o si sus variables `{…}` no coinciden.
- Las traducciones viven dentro de la app a propósito: un traductor externo (p. ej. el widget de Google) enviaría a terceros el texto de la pantalla, incluidos diarios y emociones.
- **Agregar otro idioma:** copia `pt.ts` como `xx.ts`, traduce los valores (no las claves), regístralo en `LOCALES` y `LANGS` de `src/i18n/index.ts`, y añade el código al `check` de `users.language` en `schema.sql`.
- Los colores son variables CSS (`:root` y `:root[data-theme="light"]` en `src/styles/global.css`); el tema se aplica antes de pintar la página para evitar destellos.

## Entrar con el rostro

Retomado del prototipo anterior del equipo (es lo que se conservó de él) y adaptado a Supabase:

1. **Registro** (Perfil → *Entrar con mi rostro*): con consentimiento explícito se toman 7 capturas y se guarda su promedio: **128 números, nunca una imagen**. Si ese rostro ya pertenece a otra cuenta, se rechaza. Se puede borrar en cualquier momento (y un admin también puede borrarla).
2. **Identificación 1:N**: basta con mirar a la cámara y pulsar *Identificarme* (sin parpadeo, a pedido del equipo). Se promedian 5 capturas y se comparan con todas las plantillas (distancia euclidiana ≤ 0.45, más estricto que el 0.6 clásico).
   - **Modo Supabase**: el navegador envía solo el vector a la Edge Function `face-login`, que compara en la base de datos con `service_role`, aplica un límite de 10 intentos fallidos por IP cada 15 min y devuelve un token de un solo uso para abrir la sesión. **Ningún cliente puede leer plantillas ajenas** (ni la propia): la tabla `face_templates` no expone la columna del vector.
3. El navegador recuerda que tiene un rostro registrado y abre directamente la pestaña *Mi rostro*.

**Límites (decirlos en la presentación):** es un método de **comodidad**, no de alta seguridad. Como no hay prueba de vida, una **foto o video de la persona** frente a la cámara podría servir para entrar; el umbral estricto (0.45) y el límite de intentos solo lo dificultan. La contraseña sigue existiendo como respaldo. Si más adelante se necesita más seguridad, se puede volver a agregar un reto (parpadeo, girar la cabeza) antes de identificar.

## Arquitectura

```
┌──────────────────────── Navegador (React + Vite, PWA) ────────────────────────┐
│  Páginas / componentes  →  lib/api (contrato Api)  →  supabaseApi            │
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

Los nombres visibles son en español; por dentro se conservan las claves en inglés (`guest`, `listener`, `curator`, `mentor`…). El antiguo rol «Revisor de reportes» (`moderator`) se unió con **Analista**; al ejecutar `schema.sql`, las cuentas que lo tenían pasan solas a Analista. Los roles **ya no son jerárquicos**: cada rol entra a su **propio panel** con solo sus herramientas de trabajo, y **todos** pueden usar además la parte de bienestar (detectar, actividades, progreso, ranking). Los permisos están en la tabla `role_permissions` y en `ROLE_PERMS` (`src/lib/catalog.ts`).

| Rol (clave interna) | Al entrar ve | Herramientas de trabajo |
|---|---|---|
| Visitante (`guest`) / Usuario (`listener`) | Su bienestar: nivel, racha, ánimo de la semana | — |
| Editor de contenido (`curator`) | Contenido por emoción (actividad, juego, playlist) | Contenido |
| Orientador (`mentor`) | Personas asignadas, solicitudes, sesiones | Mis acompañados |
| Analista (`analyst`) | Reportes por revisar e indicadores de 7 días | Reportes, Analítica |
| Administrador (`admin`) | Cuentas, usuarios sin orientador, reportes y analítica | Administración, Reportes, Analítica |
| Superadmin (`superadmin`) | Todos los paneles | Todo, incluido gestionar administradores |

El rango solo se usa para proteger a los administradores: suspenderlos o cambiarles el rol requiere superadmin.

### Orientación con permiso

- Cada persona puede tener un orientador: lo asigna el administrador o queda asignado cuando un orientador toma su solicitud de sesión.
- En **Mi orientación → Privacidad** la persona decide si su orientador puede ver sus emociones, actividades y progreso. Puede retirarlo cuando quiera y el acceso se corta al instante.
- Los consentimientos se guardan como historial de solo inserción (`mentor_consents`): queda el rastro de cuándo se dio y cuándo se retiró.
- El orientador **nunca** ve el diario, ni con permiso.

### Flujo automático y velocidad de la cámara

- El modelo de emociones se **descarga y precalienta en segundo plano** desde la pantalla de inicio de sesión (la primera lectura de la tarjeta gráfica es la más lenta: se hace con una imagen vacía antes de abrir la cámara).
- Al entrar a *Detectar* la cámara se abre sola y empieza a leer en cuanto el modelo está listo (en un equipo sin tarjeta gráfica, ~1 s).
- **El análisis dura al menos 6 s con la cara a cuadro** (`MIN_ANALYSIS_SECONDS`) y como mínimo 8 lecturas, para no equivocarse con un gesto suelto. El resultado es el promedio de todas las lecturas de esa ventana. Si la cara sale de cuadro, el reloj se pausa sin reiniciarse. Una barra muestra el avance.
- El inicio de sesión con rostro **no** espera: identifica con 5 capturas en cuanto se pulsa *Identificarme*.


Al detectar la emoción, la app muestra una cuenta de 1 segundo (que se puede cancelar) y lleva **directo a la actividad recomendada**, que **arranca sola**: la meditación empieza a contar, el juego hace su cuenta regresiva y el diario abre con el cursor listo. Desde la actividad se puede pulsar *Cambiar actividad*. La música de Spotify es la excepción: los navegadores no permiten reproducir sin un toque.

### Cuatro juegos por emoción (28)

| Emoción | Juegos | Idea |
|---|---|---|
| 😊 Feliz | ⭐ Lluvia de estrellas · 😄 Sonrisas escondidas · 🎵 Sigue la melodía · 🎈 Globos de colores | Aprovechar la energía y convertirla en atención |
| 😢 Triste | 🌸 Jardín de luz · 🏮 Cielo de faroles · 🧩 Rompecabezas luminoso · 💛 Pensamientos amables | Ir sin prisa, pequeñas victorias, hablarse con cariño |
| 😠 Enojo | 🫧 Burbujas de calma · 🥁 Tambor de desahogo (el ritmo se va calmando) · 🔥 Apaga las chispas · 🗑️ Al cesto | Soltar la tensión de forma segura |
| 😨 Miedo | 🗼 Faro en calma · 🐚 Busca en la calma · 💡 Enciende las luces · ✨ Une las estrellas | Respiración, anclaje al presente y sensación de control |
| 🤢 Disgusto | 🧽 Ventana limpia · ♻️ Separa y recicla · 💐 Ramo fresco · 🎨 Mandala de colores | Cambiar el foco a algo agradable y útil |
| 😮 Sorpresa | 🎁 Memoria sorpresa · 🥤 ¿Dónde quedó? · 🚦 Reflejos de luz · 🔍 ¿Qué cambió? | De la sorpresa a la atención |
| 😐 Neutral | 🎯 Encuentra el distinto · ➕ Suma rápida · 🌈 Color y palabra · 🔢 Números en orden | Activar la mente |

- Al detectar una emoción, el minijuego elige **el de esa emoción que hace más tiempo no juegas** (se recuerda en el navegador), así no se repite siempre el mismo. Con *Elegir otro juego* aparecen primero los de tu emoción y después todos los demás.
- Cada partida guarda qué juego se jugó (`activity_completions.game_key`). El marcador nunca baja de 0.
- Los juegos están en `src/pages/activities/games/` (uno por archivo, todos reciben `addScore` y `say`) y se registran en `games/index.ts`. Para agregar uno: crea el componente, añádelo a `GAMES` con su emoción y traduce sus textos (la prueba `i18n.test.ts` avisa si falta alguno; los textos dentro de listas se marcan con `tm('…')`).

---|---|---|
| 😊 Feliz | ⭐ Lluvia de estrellas | Atrapar estrellas con una canasta: aprovechar la energía |
| 😢 Triste | 🌸 Jardín de luz | Plantar flores con calma, con mensajes amables |
| 😠 Enojo | 🫧 Burbujas de calma | Reventar burbujas con lo que molesta: soltar tensión |
| 😨 Miedo | 🗼 Faro en calma | Mantener presionado al inhalar y soltar al exhalar |
| 🤢 Disgusto | 🧽 Ventana limpia | Limpiar una ventana sucia y descubrir un paisaje |

| 😐 Neutral | 🎯 Encuentra el distinto | Reto de atención que sube de nivel |

Si el minijuego se elige sin detección, se muestra un selector con los 7. Cada partida guarda qué juego se jugó (`activity_completions.game_key`). Los juegos están en `src/pages/activities/games/`.

---

## Trazabilidad con el documento del proyecto

| Requerimiento / Historia | Dónde se implementa |
|---|---|
| RF-01 / HU-02 Detección en tiempo real | `pages/Detect.tsx`, `lib/faceDetection.ts` (`ExpressionWindow`: promedio de todas las lecturas durante al menos 6 s) |
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

## Logo

El logo original del equipo está recortado en `public/`:

| Archivo | Dónde se usa |
|---|---|
| `logo-alpha.webp` | Pantallas de entrada en tema oscuro (fondo transparente, se funde con la página) |
| `logo.webp` | Pantallas de entrada en tema claro (tarjeta con el fondo azul original) |
| `logo-mark.webp` | Ícono junto a «MoodWave» en el menú |
| `favicon-64.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | Pestaña del navegador e ícono de la app instalada (PWA) |

## Estructura

```
src/
  lib/
    api/            contrato Api + implementación con Supabase
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
