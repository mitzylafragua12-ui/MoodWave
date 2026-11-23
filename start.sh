#!/bin/sh
# Levanta MoodWave en Docker y detecta la IP de esta computadora en la red local
# para que el certificado HTTPS sirva también desde el celular u otras computadoras.
# Uso: ./start.sh            (o MOODWAVE_HOSTS=192.168.1.50 ./start.sh para fijar la IP)
set -e
cd "$(dirname "$0")"

ip="${MOODWAVE_HOSTS:-}"
if [ -z "$ip" ]; then
  if [ "$(uname)" = "Darwin" ]; then
    for i in en0 en1 en2; do ip=$(ipconfig getifaddr "$i" 2>/dev/null || true); [ -n "$ip" ] && break; done
  else
    ip=$(ip route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit }}')
    [ -z "$ip" ] && ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  fi
fi

# Se guarda en .env para que "docker compose up" lo recuerde la próxima vez.
touch .env
grep -v '^MOODWAVE_HOSTS=' .env > .env.tmp || true
[ -n "$ip" ] && echo "MOODWAVE_HOSTS=$ip" >> .env.tmp
mv .env.tmp .env

docker compose up -d --build

printf 'Esperando a que MoodWave esté listo'
for _ in $(seq 1 60); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' moodwave 2>/dev/null)" = "healthy" ] && break
  printf '.'; sleep 2
done
echo
echo "MoodWave está corriendo:"
echo "  En esta computadora:   http://localhost:${MOODWAVE_PORT:-8080}"
if [ -n "$ip" ]; then
  echo "  Desde la red (HTTPS):  https://$ip:${MOODWAVE_HTTPS_PORT:-8443}"
  echo "  Certificado raíz para instalar en cada dispositivo: http://$ip:${MOODWAVE_PORT:-8080}/moodwave-ca.crt"
else
  echo "  No detecté tu IP de red; defínela con: MOODWAVE_HOSTS=192.168.x.x ./start.sh"
fi
