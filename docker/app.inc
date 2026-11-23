# Configuración común de la app (la usan el servidor HTTP y el HTTPS).
root /usr/share/nginx/html;
index index.html;

gzip on;
gzip_types text/css application/javascript application/json image/svg+xml application/manifest+json;
gzip_min_length 1024;

include /etc/nginx/moodwave/security-headers.inc;

# Archivos con hash en el nombre: se pueden guardar en caché un año.
location /assets/ {
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    include /etc/nginx/moodwave/security-headers.inc;
}

# Modelos de IA (pesados, no cambian).
location /models/ {
    try_files $uri =404;
    add_header Cache-Control "public, max-age=2592000" always;
    include /etc/nginx/moodwave/security-headers.inc;
}

# Nunca en caché: configuración, service worker, manifiesto y la página.
# El manifiesto de la PWA (nginx no trae el tipo .webmanifest en su tabla).
location = /manifest.webmanifest {
    default_type application/manifest+json;
    add_header Cache-Control "no-cache" always;
    include /etc/nginx/moodwave/security-headers.inc;
    try_files $uri =404;
}

location ~ ^/(config\.js|sw\.js|registerSW\.js|index\.html)$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    include /etc/nginx/moodwave/security-headers.inc;
    try_files $uri =404;
}

# Rutas de la SPA (/perfil, /actividad/123…) → index.html
location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache" always;
    include /etc/nginx/moodwave/security-headers.inc;
}

location = /healthz {
    access_log off;
    add_header Content-Type text/plain;
    return 200 "ok\n";
}

# Certificado raíz de MoodWave para instalarlo en los dispositivos de la red (solo el público, nunca la clave).
location = /moodwave-ca.crt {
    default_type application/x-x509-ca-cert;
    add_header Content-Disposition 'attachment; filename="MoodWave-CA.crt"' always;
    add_header Cache-Control "no-cache" always;
    include /etc/nginx/moodwave/security-headers.inc;
    try_files $uri =404;
}
