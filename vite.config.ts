import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Runtime cache for the WASM crypto module (~1.3 MiB).
 *
 * It is deliberately kept out of the precache manifest: precaching it would
 * re-download the whole module on every release where any asset changes.
 */
const WASM_CACHE_NAME = 'friendshub-wasm'

/**
 * Local development talks to the deployed API through a proxy.
 *
 * The server sends no `Access-Control-Allow-Origin` for a localhost origin, so a
 * browser cannot call it directly; proxying keeps the page same-origin for both
 * HTTP and the WebSocket upgrade. Production builds talk to the real origin
 * (whatever `VITE_API_BASE` says), so this only affects `vite dev`/`preview`.
 */
const DEV_API_TARGET = 'https://api-fh.somuch-system.ru'

const devProxy = {
  '/api/v1': { target: DEV_API_TARGET, changeOrigin: true },
  '/ws': { target: DEV_API_TARGET, changeOrigin: true, ws: true },
}

export default defineConfig({
  // Explicit IPv4: the default host is `localhost`, which on Windows resolves to
  // `[::1]`, while the harness (and anything else driving the server) uses
  // 127.0.0.1 — the two never meet.
  server: { host: '127.0.0.1', proxy: devProxy },
  preview: { host: '127.0.0.1', proxy: devProxy },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registration is done by src/utils/registerServiceWorker.ts so the app
      // controls when the worker boots (and can add update UI later).
      injectRegister: false,
      manifest: {
        id: '/',
        name: 'FriendsHub',
        short_name: 'FriendsHub',
        description: 'Приватный мессенджер со сквозным шифрованием',
        lang: 'ru',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#fc9003',
        background_color: '#1a1a3a',
        icons: [
          {
            src: '/pwa-icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        /**
         * Everything needed to boot offline. Branding source art stays out; the
         * manifest icons (192, 512, maskable) are added to the precache by the
         * plugin itself from `manifest.icons`, so they are not repeated here.
         * The favicons and the apple touch icon are only referenced by
         * index.html, hence the explicit patterns.
         */
        globPatterns: [
          '**/*.{js,css,html,svg,ico,webp,woff,woff2}',
          'pwa-icons/favicon-*.png',
          'pwa-icons/apple-touch-*.png',
        ],
        navigateFallback: '/index.html',
        // The API, the WebSocket endpoint and avatar images are never part of
        // the app shell, so a navigation fallback must not answer for them.
        navigateFallbackDenylist: [/^\/(?:api|ws|health)(?:\/|$)/, /^\/avatars\//],
        cleanupOutdatedCaches: true,
        // A newly activated worker takes over open tabs immediately, which is
        // what `registerType: 'autoUpdate'` promises.
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: WASM_CACHE_NAME,
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
