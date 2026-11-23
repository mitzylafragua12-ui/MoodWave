// Copia los modelos de face-api a /public/models
// para que se sirvan desde el mismo dominio (sin CDN externo).
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const src = join('node_modules', '@vladmandic', 'face-api', 'model');
const dest = join('public', 'models');
const wanted = [
  'tiny_face_detector_model', // detección de rostro
  'face_expression_model', // 7 emociones
  'face_landmark_68_tiny_model', // puntos de los ojos para la prueba de parpadeo (rápido)
  'face_landmark_68_model', // alineación para el descriptor facial
  'face_recognition_model', // descriptor de 128 números (inicio de sesión con rostro)
];

if (!existsSync(src)) {
  console.warn('[copy-models] No se encontró', src, '— omitiendo.');
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
for (const file of readdirSync(src)) {
  if (wanted.some((w) => file.startsWith(w))) cpSync(join(src, file), join(dest, file));
}
console.log('[copy-models] Modelos copiados a', dest);
