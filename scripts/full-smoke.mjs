#!/usr/bin/env node
/**
 * End-to-end smoke test (subphase 2.8).
 *
 *   npm run smoke:e2e
 *
 * The scenario is the acceptance criterion for this phase: register an account,
 * log in, register a Signal device, upload prekeys, exchange a message over the
 * WebSocket, decrypt it and produce the plaintext.
 *
 * It needs a real engine (IndexedDB, Web Locks, WebCrypto) and the API's CORS
 * policy refuses a localhost origin, so the page runs behind a proxy in headless
 * Edge. That plumbing — and the page itself — lives in `dev-tests/`, which is not
 * committed (the project keeps browser test pages out of git), so this file is
 * the stable entry point: it drives the harness and reports one verdict.
 *
 * Run the Node-level smoke tests instead when the harness is not available:
 * `npm run smoke:wasm`, `smoke:http`, `smoke:ws`.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')
const harnessDirectory = join(projectRoot, 'dev-tests')

const missing = ['run.mjs', 'e2e.ts', 'e2e.html', 'e2e.vite.config.ts'].filter(
  (file) => !existsSync(join(harnessDirectory, file)),
)

if (missing.length > 0) {
  console.error(
    [
      `[e2e] the browser harness is incomplete: missing ${missing.join(', ')} in dev-tests/`,
      '',
      '      Those files are deliberately not committed. Restore them from the',
      '      project history, or run the layer-level smoke tests instead:',
      '        npm run smoke:wasm',
      '        npm run smoke:http',
      '        npm run smoke:ws',
    ].join('\n'),
  )
  process.exit(1)
}

const run = spawnSync(process.execPath, [join(harnessDirectory, 'run.mjs'), 'e2e'], {
  cwd: projectRoot,
  stdio: 'inherit',
})

process.exitCode = run.status ?? 1
