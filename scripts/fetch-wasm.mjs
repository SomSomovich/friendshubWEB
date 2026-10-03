#!/usr/bin/env node
/**
 * Copies the compiled crypto module (`friendshub_wasm_bg.wasm`) into
 * `src/wasm/pkg/`.
 *
 * The binary is not committed: it is a build artifact of the sibling repository
 * `friendshub-wasm` (wasm-pack output). The JavaScript glue and the type
 * declarations next to it *are* committed, so a checkout only needs this one
 * file to build.
 *
 * Resolution order for the source:
 *   1. `$FRIENDSHUB_WASM_PKG` (a directory), for CI or a differently named checkout
 *   2. `../friendshub-wasm/pkg`, i.e. the repository cloned next to this one
 *
 * Idempotent: when the destination already matches the source byte for byte, it
 * does nothing, so it is safe as a `predev`/`prebuild` hook.
 *
 * Run manually with: npm run fetch-wasm
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const WASM_FILE = 'friendshub_wasm_bg.wasm'
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const targetPath = join(projectRoot, 'src', 'wasm', 'pkg', WASM_FILE)
const sourceDirectory =
  process.env.FRIENDSHUB_WASM_PKG ?? resolve(projectRoot, '..', 'friendshub-wasm', 'pkg')
const sourcePath = join(sourceDirectory, WASM_FILE)

async function sha256(path) {
  const bytes = await readFile(path)
  return createHash('sha256').update(bytes).digest('hex')
}

async function main() {
  const targetExists = existsSync(targetPath)
  const sourceExists = existsSync(sourcePath)

  if (!sourceExists) {
    if (targetExists) {
      // A fresh clone has the artifact but no sibling checkout; nothing to
      // compare against, and the build can proceed.
      console.log(`[wasm] ${WASM_FILE} is present; no source artifact to compare against`)
      return
    }
    console.error(
      [
        `[wasm] ${WASM_FILE} is missing and no source artifact was found at:`,
        `        ${sourcePath}`,
        '',
        '      Clone friendshub-wasm next to this project and build it',
        '      (wasm-pack build --target web), or download the artifact, or point',
        '      FRIENDSHUB_WASM_PKG at a directory that contains it.',
      ].join('\n'),
    )
    process.exitCode = 1
    return
  }

  if (targetExists) {
    const [targetHash, sourceHash] = await Promise.all([
      sha256(targetPath),
      sha256(sourcePath),
    ])
    if (targetHash === sourceHash) {
      console.log(`[wasm] ${WASM_FILE} is up to date`)
      return
    }
    await copyFile(sourcePath, targetPath)
    console.log(`[wasm] refreshed ${WASM_FILE} from ${sourceDirectory}`)
    return
  }

  await mkdir(dirname(targetPath), { recursive: true })
  await copyFile(sourcePath, targetPath)
  console.log(`[wasm] copied ${WASM_FILE} from ${sourceDirectory}`)
}

await main()
