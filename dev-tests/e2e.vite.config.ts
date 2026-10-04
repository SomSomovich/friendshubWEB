import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))

/**
 * Builds and serves the end-to-end page.
 *
 * The API is reached through a proxy: the server sends no `Access-Control-
 * Allow-Origin` for a localhost origin, so a browser cannot call it directly.
 * Going through `preview` keeps the page itself a production bundle, and the
 * WebSocket is proxied on the same origin (`ws: true` forwards the upgrade).
 *
 * `.env.e2e` (written by `dev-tests/run.mjs`, not committed) supplies the base
 * URLs, which Vite inlines at build time.
 */
const API_TARGET = 'https://api-fh.somuch-system.ru'

export default defineConfig({
  root: resolve(here, '..'),
  envDir: here,
  logLevel: 'warn',
  build: {
    outDir: resolve(here, 'e2e-dist'),
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: { e2e: resolve(here, 'e2e.html') },
    },
  },
  preview: {
    // Explicit IPv4: by default the server binds `localhost`, which on Windows
    // resolves to `[::1]`, while the harness (and the page URL it builds) uses
    // 127.0.0.1 — the two never meet.
    host: '127.0.0.1',
    port: 4299,
    strictPort: true,
    proxy: {
      '/api/v1': { target: API_TARGET, changeOrigin: true },
      '/ws': { target: API_TARGET, changeOrigin: true, ws: true },
    },
  },
})
