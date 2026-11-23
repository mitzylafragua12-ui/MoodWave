# syntax=docker/dockerfile:1
# MoodWave: compila la app (Vite) y la sirve con nginx. La base de datos sigue en Supabase.

# ---------- 1) Compilación ----------
FROM node:22-alpine AS build
WORKDIR /app
# Dependencias primero (aprovecha la caché de capas). postinstall copia los modelos de IA.
COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci --no-audit --no-fund
COPY . .
# Pruebas unitarias y build de producción (usa .env.production para Supabase).
RUN npm test && npm run build

# ---------- 2) Servidor ----------
# Imagen Debian de nginx: ya trae openssl para generar los certificados HTTPS de la red local.
FROM nginx:1.27
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.inc docker/app.inc /etc/nginx/moodwave/
COPY docker/30-moodwave-certs.sh /docker-entrypoint.d/30-moodwave-certs.sh
COPY docker/40-moodwave-config.sh /docker-entrypoint.d/40-moodwave-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
RUN chmod +x /docker-entrypoint.d/30-moodwave-certs.sh /docker-entrypoint.d/40-moodwave-config.sh \
 && chown nginx:nginx /usr/share/nginx/html /usr/share/nginx/html/config.js
EXPOSE 80 443
VOLUME /etc/moodwave/certs
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS http://127.0.0.1/healthz || exit 1
