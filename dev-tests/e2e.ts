/**
 * End-to-end scenario (subphase 2.8), run in a real browser by
 * `scripts/full-smoke.mjs`.
 *
 * Why two accounts rather than two devices of one account: this client keeps one
 * Signal device per account per browser profile — the WASM slot is the account
 * id, and the crypto snapshot is keyed by it — so a second device of the same
 * account in the same profile would collide. Two accounts exercise exactly the
 * same code path, and the acceptance criterion ("send, receive, decrypt,
 * produce plaintext") is proven by the delivery of Alice's message on Bob's
 * socket.
 *
 * The API is reached through the dev proxy (the server sends no CORS headers for
 * a localhost origin), so the page talks to its own origin for both HTTP and the
 * WebSocket.
 */
import { getMe, login, logout, register } from '../src/api/auth'
import { createDirectConversation, getConversation } from '../src/api/conversations'
import { initializeAccount } from '../src/crypto/account'
import { handleEnvelope } from '../src/crypto/receive'
import { getOrCreateSavedConversation } from '../src/crypto/saved'
import { sendMessage, sendToSaved } from '../src/crypto/send'
import type { Account, Envelope } from '../src/types'
import { initWasm, reset } from '../src/wasm'
import { setActiveClient } from '../src/ws/activeClient'
import { WsClient } from '../src/ws/client'

const MESSAGE_TEXT = 'hello from smoke test'
const SAVED_TEXT = 'saved note from smoke test'
const DELIVERY_TIMEOUT_MS = 30_000

const checks: Array<{ name: string; passed: boolean; detail?: string }> = []

function check(name: string, passed: boolean, detail?: string): void {
  checks.push(detail === undefined ? { name, passed } : { name, passed, detail })
}

function describe(error: unknown): string {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  return text.slice(0, 400)
}

async function buildAccount(fhNumber: string, password: string, deviceNumber: number, tag: string): Promise<Account> {
  const session = await login(fhNumber, password, deviceNumber)
  if (session.kind !== 'session') {
    throw new Error(`login for ${tag} demanded TOTP`)
  }

  const me = await getMe({ sessionToken: session.sessionToken, deviceNumber })
  return {
    id: me.id,
    userId: me.userId,
    fhNumber: me.fhNumber,
    username: me.username,
    avatarUrl: me.avatarUrl,
    totpEnabled: me.totpEnabled,
    deviceNumber,
    sessionToken: session.sessionToken,
    expiresAt: session.expiresAt,
  }
}

async function waitFor<T>(probe: () => T | null, timeoutMs: number): Promise<T | null> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const value = probe()
    if (value !== null) {
      return value
    }
    if (Date.now() >= deadline) {
      return null
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

async function run(): Promise<void> {
  const password = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

  // --- two fresh accounts, each with one registered device ------------------

  const aliceRegistered = await register(password)
  check('Alice registers', typeof aliceRegistered.id === 'string' && aliceRegistered.id.length > 0, aliceRegistered.fhNumber)
  const alice = await buildAccount(aliceRegistered.fhNumber, password, 1, 'Alice')
  const aliceInit = await initializeAccount(alice, 'e2e-alice')
  check('Alice registers device 1', aliceInit.deviceNumber === 1)
  check('Alice uploads a prekey pool', aliceInit.prekeysUploaded === 100, `${aliceInit.prekeysUploaded} keys`)

  const bobRegistered = await register(password)
  check('Bob registers', typeof bobRegistered.id === 'string', bobRegistered.fhNumber)
  const bob = await buildAccount(bobRegistered.fhNumber, password, 1, 'Bob')
  const bobInit = await initializeAccount(bob, 'e2e-bob')
  check('Bob registers device 1 and a prekey pool', bobInit.deviceNumber === 1 && bobInit.prekeysUploaded === 100)

  // --- Alice sends a direct message to Bob ----------------------------------

  const conversation = await createDirectConversation(alice, bob.fhNumber)
  const detail = await getConversation(alice, conversation.id)
  check(
    'the direct conversation lists both accounts',
    detail.members.includes(alice.id) && detail.members.includes(bob.id),
    `${detail.members.length} members`,
  )

  const aliceClient = new WsClient()
  const bobClient = new WsClient()
  const deliveredToBob: Envelope[] = []
  bobClient.on('delivery', (event) => {
    deliveredToBob.push(...event.envelopes)
  })

  setActiveClient(aliceClient)
  await aliceClient.connect(alice)
  check('Alice connects over the WebSocket', aliceClient.isConnected)

  const sent = await sendMessage(alice, { conversationId: conversation.id, peerAccountId: bob.id }, MESSAGE_TEXT)
  check('Alice encrypts for exactly one Bob device', sent.envelopeIds.length === 1, sent.envelopeIds.join(','))
  // Alice has no other devices, so there is nobody to sync a copy to.
  check('no sync copies are produced for a single-device account', sent.envelopes.length === sent.envelopeIds.length)

  await aliceClient.close()
  setActiveClient(bobClient)

  // --- Bob receives it from the backlog and decrypts ------------------------

  await bobClient.connect(bob)
  check('Bob connects over the WebSocket', bobClient.isConnected)

  const bobEnvelopeId = sent.envelopeIds[0]
  const delivered = await waitFor(
    () => deliveredToBob.find((envelope) => envelope.envelopeId === bobEnvelopeId) ?? null,
    DELIVERY_TIMEOUT_MS,
  )
  check(
    'the envelope is delivered to Bob with its ciphertext intact',
    delivered !== undefined && delivered !== null && delivered.senderAccountId === alice.id,
    delivered === undefined ? 'not delivered' : `type ${delivered.envelopeType}, ${delivered.ciphertext.length / 2} bytes`,
  )

  if (delivered === undefined || delivered === null) {
    throw new Error('the delivery never arrived; nothing to decrypt')
  }

  const received = await handleEnvelope(bob, delivered)
  check('the envelope decrypts to a message', received.kind === 'message', received.kind)
  check(
    'and the plaintext is exactly what Alice sent',
    received.plaintext === MESSAGE_TEXT,
    JSON.stringify(received.plaintext),
  )
  check('no identity key changed during the exchange', received.identityChanges.length === 0)

  await bobClient.ackEnvelopes([delivered.envelopeId])
  check('Bob acknowledges the envelope', true)

  // --- Saved Messages -------------------------------------------------------

  const savedOnce = await getOrCreateSavedConversation(alice)
  const savedTwice = await getOrCreateSavedConversation(alice)
  check('the saved conversation is created and stable', savedOnce.id === savedTwice.id && savedOnce.kind === 'saved', savedOnce.id)

  const savedSend = await sendToSaved(alice, SAVED_TEXT, savedOnce.id)
  check(
    'a saved message is stored locally',
    savedSend.message.plaintext === SAVED_TEXT && savedSend.message.conversationId === savedOnce.id,
  )
  // Saved messages go to this account's *other* devices, so a single-device
  // account sends nothing over the wire. That is the documented behaviour, and
  // the wire round trip is what the Alice-to-Bob exchange above proved.
  check(
    'and produces no envelopes for a single-device account',
    savedSend.envelopes.length === 0,
    `${savedSend.envelopes.length} envelopes`,
  )

  // --- cleanup --------------------------------------------------------------

  await bobClient.close()
  await logout(alice)
  await logout(bob)
  await reset(alice.id)
  await reset(bob.id)
  check('both accounts log out and release their crypto state', true)

  // In the verdict, not just the console: the runner prints the verdict, and a
  // throwaway account whose password is only in the browser's console cannot be
  // cleaned up afterwards.
  check(
    'the throwaway accounts are reported for cleanup',
    true,
    `Alice ${alice.fhNumber} / Bob ${bob.fhNumber}, password ${password}`,
  )
}

async function main(): Promise<void> {
  await initWasm()

  try {
    await run()
  } catch (error) {
    check('the scenario ran to completion', false, describe(error))
  }

  const failures = checks.filter((entry) => !entry.passed)
  const lines = checks.map(
    (entry) => `${entry.passed ? 'PASS' : 'FAIL'} ${entry.name}${entry.detail === undefined ? '' : ` (${entry.detail})`}`,
  )

  const output = document.getElementById('out')
  if (output !== null) {
    output.textContent = lines.join('\n')
  }
  document.title = `e2e:${failures.length === 0 ? 'pass' : 'fail'}`

  const resultUrl = new URLSearchParams(location.hash.replace(/^#/, '')).get('result')
  if (resultUrl !== null) {
    await fetch(resultUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ total: checks.length, failures: failures.length, lines }),
    })
  }
}

void main()
