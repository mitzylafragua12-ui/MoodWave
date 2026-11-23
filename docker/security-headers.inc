# Encabezados comunes (nginx no hereda add_header si una location define los suyos).
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
# La cámara solo la puede pedir la propia app (detección de emociones e inicio de sesión con rostro).
add_header Permissions-Policy "camera=(self), microphone=(), geolocation=()" always;
