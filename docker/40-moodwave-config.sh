#!/bin/sh
# Genera config.js al arrancar el contenedor a partir de variables de entorno.
# Si no se definen, la app usa las credenciales con las que se compiló (.env.production).
set -eu
CONFIG=/usr/share/nginx/html/config.js

valid() { printf '%s' "$1" | grep -Eq '^[A-Za-z0-9._:/=+-]+$'; }

if [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_ANON_KEY:-}" ]; then
  if ! valid "$SUPABASE_URL" || ! valid "$SUPABASE_ANON_KEY"; then
    echo "moodwave: SUPABASE_URL o SUPABASE_ANON_KEY tienen caracteres no válidos" >&2
    exit 1
  fi
  printf 'window.__MOODWAVE_CONFIG__ = { supabaseUrl: "%s", supabaseAnonKey: "%s" };\n' \
    "$SUPABASE_URL" "$SUPABASE_ANON_KEY" > "$CONFIG"
  echo "moodwave: usando Supabase de las variables de entorno ($SUPABASE_URL)"
else
  printf 'window.__MOODWAVE_CONFIG__ = {};\n' > "$CONFIG"
  echo "moodwave: usando el Supabase con el que se compiló la imagen"
fi
