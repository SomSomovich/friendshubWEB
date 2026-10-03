#!/usr/bin/env node
/**
 * WebSocket smoke test (subphase 2.5).
 *
 *   npm run smoke:ws
 *
 * Registers a throwaway account on the first run and remembers it in
 * `scripts/.smoke-account.json` (not committed), so later runs log in instead of
 * creating another one.
 *
 * The point is that the whole wire path works against the real server: the
 * handshake, a ping round trip, an envelope uploaded and delivered back intact
 * through the protobuf codecs, the acknowledgement, the fatal-error path, and a
 * clean close. The ciphertext in the test envelope is deliberately not real
 * crypto — this subphase is about transport, and decryption is 2.6.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { login, register } from '../src/api/auth.ts'
import { ApiError } from '../src/api/errors.ts'
import { getPrekeyStatus } from '../src/api/prekeys.ts'
import { getSavedConversation } from '../src/api/saved.ts'
import { initializeAccount } from '../src/crypto/account.ts'
import { initWasm } from '../src/wasm/index.ts'
import { WsClient } from '../src/ws/client.ts'
import { ENVELOPE_TYPE_MESSAGE } from '../src/ws/envelopeTypes.ts'
import { WsError } from '../src/ws/errors.ts'

const here = dirname(fileURLToPath(import.meta.url))
const accountFile = join(here, '.smoke-account.json')
const TRANSPORT_ATTEMPTS = 10

/** Retries a call whose failure was `status: 0` — a dropped connection, not an answer. */
async function call(invoke) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await invoke()
    } catch (error) {
      const transient = error instanceof ApiError && error.isTransportFailure
      if (!transient || attempt >= TRANSPORT_ATTEMPTS) {
        throw error
      }
      console.warn(`  (connection dropped, retry ${attempt}/${TRANSPORT_ATTEMPTS - 1})`)
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
    }
  }
}

let checks = 0
let failures = 0

function check(name, passed, detail) {
  checks += 1
  if (passed) {
    console.log(`PASS ${name}${detail === undefined ? '' : ` (${detail})`}`)
    return
  }
  failures += 1
  console.log(`FAIL ${name}${detail === undefined ? '' : ` (${detail})`}`)
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Polls a predicate until it produces a truthy value or the deadline passes. */
async function waitFor(predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const value = predicate()
    if (value) {
      return value
    }
    if (Date.now() >= deadline) {
      return null
    }
    await delay(100)
  }
}

/** Logs in when a previous run left an account behind, registers one otherwise. */
async function ensureAccount() {
  if (existsSync(accountFile)) {
    const stored = JSON.parse(readFileSync(accountFile, 'utf8'))
    const session = await call(() => login(stored.fhNumber, stored.password, stored.deviceNumber))
    if (session.kind !== 'session') {
      throw new Error('the stored smoke account now demands TOTP; delete the file to start over')
    }
    console.log(`reusing the smoke account ${stored.fhNumber}`)
    return { ...stored, sessionToken: session.sessionToken }
  }

  const wasmBytes = readFileSync(join(here, '..', 'src', 'wasm', 'pkg', 'friendshub_wasm_bg.wasm'))
  await initWasm(wasmBytes)

  const password = `smoke_test_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  const registered = await call(() => register(password))
  // Printed immediately: if the run dies half-way, the account can still be
  // found and removed by hand.
  console.log(`registered the smoke account ${registered.fhNumber}`)

  const session = await call(() => login(registered.fhNumber, password, 1))
  if (session.kind !== 'session') {
    throw new Error('a fresh account asked for TOTP')
  }

  // A real identity and a real prekey pool, so the account is usable for the
  // end-to-end round trip in 2.8 as well. This is the production path — the same
  // `initializeAccount` the app runs, including the batched prekey upload.
  //
  // Deliberately not wrapped in the transport retry: the flow registers a device,
  // and re-running it would create a second one while the session stays bound to
  // the first (which is exactly the failure `registerDeviceOrRecover` handles
  // internally).
  const initialised = await initializeAccount(
    {
      id: registered.id,
      userId: registered.userId,
      fhNumber: registered.fhNumber,
      username: registered.username,
      avatarUrl: null,
      totpEnabled: false,
      deviceNumber: 1,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
    },
    'smoke-ws',
  )

  const stored = {
    fhNumber: registered.fhNumber,
    password,
    accountId: registered.id,
    deviceNumber: initialised.deviceNumber,
    identityKeyPub: initialised.identityPubHex,
  }
  writeFileSync(accountFile, `${JSON.stringify(stored, null, 2)}\n`)
  return { ...stored, sessionToken: session.sessionToken }
}

const account = await ensureAccount()
const auth = { sessionToken: account.sessionToken, deviceNumber: account.deviceNumber }

// A session can only be established if the server has keys to hand out, so an
// empty pool here would quietly break the round trip in 2.6 and 2.8.
const pool = await call(() => getPrekeyStatus(auth))
check(
  'the server holds prekeys for this device',
  pool.oneTimeAvailable > 0 && pool.hasSignedPrekey,
  `${pool.oneTimeAvailable} one-time keys, signed prekey: ${pool.hasSignedPrekey}`,
)

const client = new WsClient()
const seen = { connected: [], disconnected: [], error: [], fatal: [], delivery: [], receipt: [] }
for (const event of Object.keys(seen)) {
  client.on(event, (payload) => seen[event].push(payload))
}

// --- handshake --------------------------------------------------------------

await client.connect(auth)
check('the handshake completes and the client reports connected', client.isConnected)

const hello = seen.connected[0]
check(
  'ServerHello names this account and device',
  hello?.accountId === account.accountId && hello?.deviceNumber === account.deviceNumber,
  hello ? `session=${hello.sessionId} device=${hello.deviceNumber}` : 'no connected event',
)

// --- ping round trip --------------------------------------------------------

const roundTripMs = await client.ping()
check('a ping is answered by a pong', typeof roundTripMs === 'number' && roundTripMs >= 0, `${roundTripMs} ms`)

// --- upload, receipt and delivery -------------------------------------------

const saved = await call(() => getSavedConversation(auth))
const envelopeId = crypto.randomUUID()
const ciphertext = '3311'.padEnd(96, 'ab')
const envelope = {
  envelopeId,
  senderAccountId: account.accountId,
  senderDeviceNumber: account.deviceNumber,
  recipientAccountId: account.accountId,
  recipientDeviceNumber: account.deviceNumber,
  envelopeType: ENVELOPE_TYPE_MESSAGE,
  isPrekeyMessage: false,
  ciphertext,
  clientTimestamp: Math.floor(Date.now() / 1000),
  conversationId: saved.conversationId,
  senderIsBot: false,
}

await client.uploadEnvelopes([envelope])

const receipt = await waitFor(
  () => seen.receipt.find((entry) => entry.envelopeIds.includes(envelopeId)),
  5_000,
)
check('the server confirms the upload with a receipt', receipt !== undefined, `receipts=${seen.receipt.length}`)

const delivered = await waitFor(
  () => seen.delivery.flatMap((entry) => entry.envelopes).find((entry) => entry.envelopeId === envelopeId),
  5_000,
)
check(
  'the envelope comes back byte-identical through the protobuf codecs',
  delivered !== undefined &&
    delivered.envelopeType === ENVELOPE_TYPE_MESSAGE &&
    delivered.ciphertext === ciphertext &&
    delivered.conversationId === saved.conversationId &&
    delivered.senderDeviceNumber === account.deviceNumber,
  delivered ? `type=${delivered.envelopeType} bytes=${delivered.ciphertext.length / 2}` : 'not delivered',
)

let ackError = null
try {
  await client.ackEnvelopes([envelopeId])
} catch (error) {
  ackError = error
}
check('acknowledging the envelope succeeds', ackError === null, ackError ? String(ackError) : 'sent')

// --- a rejected connection does not loop ------------------------------------

const rejected = new WsClient()
let rejectedError = null
try {
  await rejected.connect({ sessionToken: 'definitely-not-a-token', deviceNumber: account.deviceNumber })
} catch (error) {
  rejectedError = error
}
check(
  'a bad token is refused',
  rejectedError instanceof WsError,
  rejectedError instanceof WsError ? rejectedError.code : String(rejectedError),
)
check(
  'and the rejected client stays closed instead of reconnecting',
  rejected.isConnected === false,
)
await rejected.close()

// --- clean shutdown ---------------------------------------------------------

await client.close()
check(
  'closing emits a final disconnect and leaves the client closed',
  client.isConnected === false && seen.disconnected.at(-1)?.final === true,
  JSON.stringify(seen.disconnected.at(-1)),
)

console.log(`\nsmoke account: ${account.fhNumber} (stored in scripts/.smoke-account.json)`)
if (failures === 0) {
  console.log(`ALL ${checks} CHECKS PASSED`)
} else {
  console.log(`${failures} OF ${checks} CHECKS FAILED`)
}
process.exitCode = failures === 0 ? 0 : 1
