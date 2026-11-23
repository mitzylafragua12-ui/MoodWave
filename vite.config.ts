import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// En GitHub Pages la app vive en /MoodWave/ (el workflow define VITE_BASE). En local y Vercel, '/'.
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'MoodWave — Ride your emotions',
        short_name: 'MoodWave',
        description: 'Plataforma de bienestar emocional con detección facial y actividades de autocuidado.',
        lang: 'es-MX',
        theme_color: '#0b1120',
        background_color: '#0b1120',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Los modelos de face-api pesan ~0.5 MB; se cachean para uso offline.
        globPatterns: ['**/*.{js,css,html,svg,png,json,bin}'],
        // El modelo de reconocimiento (6 MB) solo se usa al entrar con rostro: se cachea al primer uso.
        globIgnores: ['**/face_recognition_model*', '**/config.js'], // config.js cambia por despliegue: siempre de la red
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [{
          urlPattern: ({ url }) => url.pathname.includes('/models/'),
          handler: 'CacheFirst',
          options: { cacheName: 'face-models', expiration: { maxEntries: 20 } },
        }],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 1500 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
