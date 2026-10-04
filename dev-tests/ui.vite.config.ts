import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')

/**
 * Builds the app together with the seed page, as a normal HTML build.
 *
 * Not a library build on purpose: library mode does not substitute
 * `import.meta.env`, and `define` cannot express it either (`import.meta` is not
 * a plain identifier chain), so a library build would silently fall back to the
 * production API and hit CORS. Here the app and the seed page share one build
 * with the harness environment substituted the ordinary way.
 *
 * `dev-tests/run.mjs` writes `.env.harness` (this config's `envDir`) and serves
 * the output through the proxy below.
 */
const API_TARGET = 'https://api-fh.somuch-system.ru'
const PREVIEW_PORT = 4297

export default defineConfig({
  root: projectRoot,
  envDir: here,
  logLevel: 'warn',
  // Without the Tailwind plugin the app keeps its `@import "tailwindcss"` as
  // written and renders unstyled — the harness build must match the real one.
  plugins: [tailwindcss()],
  build: {
    outDir: resolve(here, 'ui-dist'),
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: {
        app: resolve(projectRoot, 'index.html'),
        seed: resolve(here, 'seed.html'),
      },
    },
  },
  server: {
    host: '127.0.0.1',
    proxy: {
      '/api/v1': { target: API_TARGET, changeOrigin: true },
      '/ws': { target: API_TARGET, changeOrigin: true, ws: true },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: PREVIEW_PORT,
    strictPort: true,
    proxy: {
      '/api/v1': { target: API_TARGET, changeOrigin: true },
      '/ws': { target: API_TARGET, changeOrigin: true, ws: true },
    },
  },
})
