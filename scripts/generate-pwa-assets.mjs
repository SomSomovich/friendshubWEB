#!/usr/bin/env node
/**
 * Generates the PWA icon set into `public/pwa-icons/`.
 *
 * `@vite-pwa/assets-generator` always writes next to the source image, so the
 * canonical source (`public/icons/icon-512.png`) cannot be passed directly —
 * that would scatter generated icons through `public/icons/`. This script
 * copies the source there under a temporary name, runs the generator against
 * the copy, then deletes it, leaving only generated icons behind.
 *
 * Run with: npm run pwa:assets
 */
import { spawn } from 'node:child_process'
import { copyFile, mkdir, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const SOURCE_ICON = join(projectRoot, 'public', 'icons', 'icon-512.png')
const OUTPUT_DIR = join(projectRoot, 'public', 'pwa-icons')
const TEMP_SOURCE_RELATIVE = 'public/pwa-icons/icon-source.png'
const TEMP_SOURCE = join(OUTPUT_DIR, 'icon-source.png')

const generatorBin = join(
  dirname(require.resolve('@vite-pwa/assets-generator/package.json')),
  'bin',
  'pwa-assets-generator.mjs',
)

/** @param {number | null} code */
function runGenerator() {
  return new Promise((resolveExit) => {
    const child = spawn(process.execPath, [generatorBin, TEMP_SOURCE_RELATIVE], {
      cwd: projectRoot,
      stdio: 'inherit',
    })
    child.on('error', (error) => {
      console.error('[pwa-assets] failed to start the generator:', error)
      resolveExit(1)
    })
    child.on('close', (code) => {
      resolveExit(code ?? 1)
    })
  })
}

await mkdir(OUTPUT_DIR, { recursive: true })
await copyFile(SOURCE_ICON, TEMP_SOURCE)
try {
  const exitCode = await runGenerator()
  if (exitCode !== 0) {
    process.exitCode = exitCode
    console.error(`[pwa-assets] generator exited with code ${exitCode}`)
  } else {
    console.log('[pwa-assets] icons written to public/pwa-icons/')
  }
} finally {
  await rm(TEMP_SOURCE, { force: true })
}
