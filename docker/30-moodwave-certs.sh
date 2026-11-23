#!/bin/sh
# Certificados HTTPS para la red local.
#  1) La primera vez crea una autoridad de certificados (CA) propia de MoodWave.
#  2) Firma con ella el certificado del servidor para localhost + las IPs/nombres de MOODWAVE_HOSTS.
#  3) Publica el certificado de la CA (solo la parte pública) en /moodwave-ca.crt para instalarlo
#     en cada dispositivo; así el navegador confía en el sitio y permite la cámara.
# Todo se guarda en el volumen /etc/moodwave/certs: la CA no cambia entre reinicios.
set -eu
DIR=/etc/moodwave/certs
mkdir -p "$DIR"
chmod 700 "$DIR"

# --- nombres e IPs del certificado
HOSTS="${MOODWAVE_HOSTS:-}"
if [ -n "$HOSTS" ] && ! printf '%s' "$HOSTS" | grep -Eq '^[A-Za-z0-9.,:-]+$'; then
  echo "moodwave: MOODWAVE_HOSTS solo admite IPs y nombres separados por comas" >&2
  exit 1
fi
SAN="DNS:localhost,IP:127.0.0.1,IP:::1"
OLD_IFS=$IFS; IFS=','
for h in $HOSTS; do
  [ -z "$h" ] && continue
  if printf '%s' "$h" | grep -Eq '^[0-9]{1,3}(\.[0-9]{1,3}){3}$|:'; then SAN="$SAN,IP:$h"; else SAN="$SAN,DNS:$h"; fi
done
IFS=$OLD_IFS

# --- autoridad de certificados (una sola vez)
if [ ! -s "$DIR/ca.key" ] || [ ! -s "$DIR/ca.crt" ]; then
  echo "moodwave: creando la autoridad de certificados local"
  openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 3650 \
    -keyout "$DIR/ca.key" -out "$DIR/ca.crt" \
    -subj "/O=MoodWave/CN=MoodWave Local CA" \
    -addext "basicConstraints=critical,CA:TRUE" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" 2>/dev/null
  rm -f "$DIR/server.crt"
fi
chmod 600 "$DIR/ca.key"

# --- certificado del servidor (se rehace si cambian las IPs o está por vencer)
if [ ! -s "$DIR/server.crt" ] || [ "$(cat "$DIR/server.san" 2>/dev/null)" != "$SAN" ] \
   || ! openssl x509 -checkend 2592000 -noout -in "$DIR/server.crt" >/dev/null 2>&1; then
  echo "moodwave: generando certificado HTTPS para: $SAN"
  printf 'subjectAltName=%s\nbasicConstraints=CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n' "$SAN" > "$DIR/server.ext"
  openssl req -new -newkey rsa:2048 -nodes -sha256 -keyout "$DIR/server.key" -out "$DIR/server.csr" \
    -subj "/O=MoodWave/CN=MoodWave" 2>/dev/null
  # 825 días: el máximo que aceptan iOS y macOS para certificados de servidor.
  openssl x509 -req -sha256 -days 825 -in "$DIR/server.csr" -CA "$DIR/ca.crt" -CAkey "$DIR/ca.key" \
    -CAcreateserial -out "$DIR/server.crt" -extfile "$DIR/server.ext" 2>/dev/null
  printf '%s' "$SAN" > "$DIR/server.san"
  rm -f "$DIR/server.csr"
fi
chmod 600 "$DIR/server.key"

cp "$DIR/ca.crt" /usr/share/nginx/html/moodwave-ca.crt
chmod 644 /usr/share/nginx/html/moodwave-ca.crt
echo "moodwave: HTTPS listo (certificado raíz en /moodwave-ca.crt)"
