import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))

/**
 * The port `dev-tests/ui.vite.config.ts` serves its proxy on.
 *
 * These entries talk to IndexedDB and nothing else, so the value only has to be
 * there — `src/utils/env.ts` reads `import.meta.env` as one object, and leaving
 * the key out would be a different kind of wrong.
 */
const HARNESS_PORT = 4297


/**
 * Bundles the storage smoke entry in production mode.
 *
 * Kept separate from the app build on purpose: this entry must never end up in
 * `dist/`, and the app build must not depend on this (uncommitted) directory.
 * `minify: false` keeps stack traces readable; the bundling and module
 * resolution are the same as a production build.
 */
export default defineConfig({
  root: resolve(here, '..'),
  logLevel: 'warn',
  // The entries are scripts, not a site: copying the app's public assets here
  // would only duplicate them.
  publicDir: false,
  /**
   * Library mode does not substitute `import.meta.env` — it leaves the reference
   * for whoever consumes the bundle — so the harness entries would otherwise fall
   * back to the production API and hit CORS. The whole object is defined, because
   * `src/utils/env.ts` reads it as one.
   */
  define: {
    'import.meta.env': JSON.stringify({
      VITE_API_BASE: '/api/v1',
      VITE_WS_URL: `ws://127.0.0.1:${HARNESS_PORT}/ws`,
    }),
  },
  build: {
    outDir: resolve(here, 'dist'),
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: resolve(here, 'indexeddb-smoke.ts'),
      formats: ['es'],
      fileName: () => 'smoke.js',
    },
  },
})
