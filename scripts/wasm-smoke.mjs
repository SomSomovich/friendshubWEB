#!/usr/bin/env node
/**
 * Node smoke test for the WASM bridge (subphase 2.1).
 *
 *   npm run smoke:wasm
 *
 * Instantiation passes the `.wasm` bytes explicitly: the generated glue would
 * otherwise `fetch` a `file://` URL, which Node does not support. The browser
 * path (`initWasm()` with no argument) is verified separately against a
 * production build.
 *
 * Observations that differ from WASM_API.txt are printed as `info:` lines rather
 * than asserted, because the module — not the documentation — is the source of
 * truth for what the app must handle.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  WasmError,
  clearIdentityChanges,
  createSenderKeyDistribution,
  generateAttachmentKey,
  generateIdentity,
  generatePrekeys,
  groupEncrypt,
  identityChanges,
  initWasm,
  localIdentityPublic,
  openChunk,
  ping,
  prekeyCounts,
  reset,
  restore,
  sealChunk,
  snapshot,
} from '../src/wasm/index.ts'
import { bytesToHex, hexToBytes, hexToUtf8, utf8ToHex } from '../src/utils/hex.ts'

const HEX = /^[0-9a-f]+$/
const HEX_33_BYTES = /^[0-9a-f]{66}$/
const HEX_32_BYTES = /^[0-9a-f]{64}$/

function createChecks() {
  let failures = 0

  function check(name, passed, detail) {
    const suffix = detail === undefined ? '' : ` (${detail})`
    if (passed) {
      console.log(`PASS ${name}${suffix}`)
      return
    }
    failures += 1
    console.log(`FAIL ${name}${suffix}`)
  }

  async function captureWasmError(invoke) {
    try {
      await invoke()
      return null
    } catch (error) {
      return error instanceof WasmError ? error : null
    }
  }

  async function expectWasmError(name, invoke, expectedCode) {
    try {
      await invoke()
      check(name, false, 'did not throw')
    } catch (error) {
      const isWasm = error instanceof WasmError
      const codeMatches = expectedCode === undefined || error?.code === expectedCode
      check(
        name,
        isWasm && codeMatches,
        isWasm ? `code=${error.code}` : `unexpected ${error?.name}: ${error?.message}`,
      )
    }
  }

  function finish() {
    if (failures === 0) {
      console.log('\nALL CONTRACT CHECKS PASSED')
      return 0
    }
    console.log(`\n${failures} CONTRACT CHECK(S) FAILED`)
    return 1
  }

  return { check, captureWasmError, expectWasmError, finish }
}

const here = dirname(fileURLToPath(import.meta.url))
const wasmBytes = readFileSync(join(here, '..', 'src', 'wasm', 'pkg', 'friendshub_wasm_bg.wasm'))
const checks = createChecks()

await initWasm(wasmBytes)
checks.check('ping returns pong', (await ping()) === 'pong')

const accountId = `smoke-${Date.now()}`
const identity = await generateIdentity(accountId, 4242)
checks.check(
  'identity public key is 33 bytes of hex',
  HEX_33_BYTES.test(identity.publicKeyHex),
  `${identity.publicKeyHex.length / 2} bytes`,
)
checks.check(
  'local_identity_public agrees with generate_identity',
  (await localIdentityPublic(accountId)) === identity.publicKeyHex,
)
checks.check('identity key pair blob is hex', HEX.test(identity.keyPairHex))
// WASM_API.txt claims 65 bytes; the module serializes libsignal's own encoding.
// Harmless in practice — `load_identity`/`restore` accept both — but the
// mismatch is why the bridge never slices this blob and reads the public key
// from `local_identity_public` instead.
console.log(`info: identity key pair blob is ${identity.keyPairHex.length / 2} bytes (docs say 65)`)

const snapshotJson = await snapshot(accountId)
let snapshotShape = null
try {
  snapshotShape = JSON.parse(snapshotJson)
} catch {
  // Unparsable JSON is reported by the check below.
}
checks.check(
  'snapshot returns JSON with the documented keys',
  snapshotShape !== null &&
    ['identity', 'registration_id', 'pre_keys', 'signed_pre_keys', 'sessions'].every(
      (key) => key in snapshotShape,
    ),
)

const utf8Sample = 'FriendsHub · привет 👋'
checks.check(
  'utf8ToHex/hexToUtf8 round-trip keeps multi-byte text',
  hexToUtf8(utf8ToHex(utf8Sample)) === utf8Sample,
)
const byteSample = new Uint8Array([0, 1, 2, 253, 254, 255])
checks.check(
  'bytesToHex/hexToBytes round-trip',
  bytesToHex(hexToBytes(bytesToHex(byteSample))) === bytesToHex(byteSample),
)

const attachmentKey = await generateAttachmentKey()
checks.check(
  'attachment key is 32 bytes with a 4-byte nonce',
  HEX_32_BYTES.test(attachmentKey.keyHex) && /^[0-9a-f]{8}$/.test(attachmentKey.baseNonceHex),
)
const chunkPlaintext = new TextEncoder().encode('chunk-payload-0123456789')
const sealedAtZero = await sealChunk(attachmentKey.keyHex, attachmentKey.baseNonceHex, 0, chunkPlaintext)
const sealedAtSeven = await sealChunk(attachmentKey.keyHex, attachmentKey.baseNonceHex, 7, chunkPlaintext)
checks.check(
  'seal_chunk appends a 16-byte tag',
  sealedAtZero.length === chunkPlaintext.length + 16,
  `${sealedAtZero.length} bytes`,
)
checks.check(
  'chunk index is authenticated (different index, different ciphertext)',
  bytesToHex(sealedAtZero) !== bytesToHex(sealedAtSeven),
)
const opened = await openChunk(attachmentKey.keyHex, attachmentKey.baseNonceHex, 0, sealedAtZero)
checks.check(
  'open_chunk round-trip returns the plaintext',
  bytesToHex(opened) === bytesToHex(chunkPlaintext),
)
await checks.expectWasmError('open_chunk rejects a mismatched chunk index', () =>
  openChunk(attachmentKey.keyHex, attachmentKey.baseNonceHex, 1, sealedAtZero),
)

const distribution = await createSenderKeyDistribution(accountId, 1, 'smoke-conversation')
checks.check('sender key distribution returns hex', HEX.test(distribution))
const groupMessage = await groupEncrypt(accountId, 1, 'smoke-conversation', utf8ToHex('hi'))
checks.check('group_encrypt returns hex', HEX.test(groupMessage))
// WASM_API.txt §6 says a group message is recognised by `ciphertext[0] === 0x03`;
// the module emits this instead. `src/crypto/receive.ts` routes on the observed
// value, so the number is recorded here rather than guessed at.
console.log(
  `info: group ciphertext starts with 0x${groupMessage.slice(0, 2)} (docs say 0x03), ` +
    `distribution with 0x${distribution.slice(0, 2)}`,
)

checks.check('identity_changes is empty for a fresh account', (await identityChanges(accountId)).length === 0)
await clearIdentityChanges(accountId)

const prekeys = await generatePrekeys(accountId, 3)
checks.check(
  'generate_prekeys returns a signed prekey, a Kyber last-resort and both one-time pools',
  prekeys.oneTimePrekeys.length === 3 &&
    prekeys.kyberOneTimePrekeys.length === 3 &&
    prekeys.signedPrekey.id > 0 &&
    typeof prekeys.signedPrekey.sig === 'string' &&
    typeof prekeys.kyberLastResort.sig === 'string',
  `signed=${prekeys.signedPrekey.id} otk=${prekeys.oneTimePrekeys.length}/${prekeys.kyberOneTimePrekeys.length}`,
)
checks.check(
  'generate_prekeys returns hex key material',
  HEX.test(prekeys.signedPrekey.pub) &&
    HEX.test(prekeys.kyberLastResort.pub) &&
    prekeys.oneTimePrekeys.every((prekey) => HEX.test(prekey.pub)) &&
    prekeys.oneTimePrekeys.every((prekey) => prekey.sig === undefined),
)
const counts = await prekeyCounts(accountId)
checks.check(
  'prekey_counts reflects the generated pool',
  counts.oneTimeAvailable === 3 &&
    counts.kyberOneTimeAvailable >= 1 &&
    counts.hasSignedPrekey &&
    counts.hasKyberLastResort,
  `otk=${counts.oneTimeAvailable} kyber=${counts.kyberOneTimeAvailable}`,
)

const sourceAccount = `smoke-source-${Date.now()}`
const copyAccount = `${sourceAccount}-copy`
const sourceIdentity = await generateIdentity(sourceAccount, 99)
await generatePrekeys(sourceAccount, 2)
const sourceSnapshot = await snapshot(sourceAccount)
await restore(copyAccount, sourceSnapshot)
checks.check(
  'snapshot -> restore into another slot preserves the identity',
  (await localIdentityPublic(copyAccount)) === sourceIdentity.publicKeyHex,
)
checks.check(
  'snapshot -> restore preserves prekey state',
  (await prekeyCounts(copyAccount)).oneTimeAvailable === 2,
)

await reset(accountId)
await checks.expectWasmError(
  'reset clears the account, so its identity is gone',
  () => localIdentityPublic(accountId),
  'no_identity',
)
const identityError = await checks.captureWasmError(() => localIdentityPublic(accountId))
checks.check(
  'WasmError carries the operation name',
  identityError?.operation === 'local_identity_public',
  `operation=${identityError?.operation}`,
)

process.exitCode = checks.finish()
