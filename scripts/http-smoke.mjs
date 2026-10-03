#!/usr/bin/env node
/**
 * HTTP smoke test for the API layer (subphase 2.4).
 *
 *   npm run smoke:http
 *
 * Runs against the real server (VITE_API_BASE, otherwise the production
 * fallback). Beyond the prescribed `/health` check it walks the read endpoints
 * with two throwaway accounts: the response types claim camelCase field names,
 * and a mapper that silently disagrees with the server is exactly the kind of
 * bug that would otherwise surface for the first time in a Phase 4 screen.
 *
 * The link to the server drops connections now and then (ECONNRESET); the
 * client does not retry those — it mirrors the native client, which retries only
 * 429 — so the harness retries at its own level.
 *
 * The accounts it creates are printed at the end for manual cleanup; they hold
 * no data.
 */
import { API_HEALTH_URL, request } from '../src/api/client.ts'
import { getMe, login, register } from '../src/api/auth.ts'
import { listOwnDevices, registerDevice } from '../src/api/devices.ts'
import { getPrekeyStatus } from '../src/api/prekeys.ts'
import { createDirectConversation, listConversations } from '../src/api/conversations.ts'
import { addContact, listBlocks, listContacts } from '../src/api/contacts.ts'
import { getSavedConversation, getSavedMessages } from '../src/api/saved.ts'
import { getAccountPresence, getAccountProfile, listPresenceExceptions } from '../src/api/profile.ts'
import { listSessions } from '../src/api/sessions.ts'
import { resolveHandle } from '../src/api/handles.ts'
import { getIceServers } from '../src/api/webrtc.ts'
import { ApiError } from '../src/api/errors.ts'

const TRANSPORT_ATTEMPTS = 4

let failures = 0
let checks = 0

function check(name, passed, detail) {
  checks += 1
  if (passed) {
    console.log(`PASS ${name}${detail === undefined ? '' : ` (${detail})`}`)
    return
  }
  failures += 1
  console.log(`FAIL ${name}${detail === undefined ? '' : ` (${detail})`}`)
}

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

async function captureApiError(invoke) {
  try {
    await call(invoke)
    return null
  } catch (error) {
    return error instanceof ApiError ? error : null
  }
}

/** A random 33-byte identity key, as the server expects from a fresh device. */
function randomIdentityKeyHex() {
  const bytes = crypto.getRandomValues(new Uint8Array(33))
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function createAccount(tag) {
  const password = `smoke_${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const registered = await call(() => register(password))
  const session = await call(() => login(registered.fhNumber, password, 1))
  if (session.kind !== 'session') {
    throw new Error(`login asked for TOTP on a fresh account (${tag})`)
  }
  const device = await call(() =>
    registerDevice(
      { sessionToken: session.sessionToken },
      {
        name: `smoke-${tag}`,
        registrationId: 1000 + Math.floor(Math.random() * 8000),
        identityKeyPub: randomIdentityKeyHex(),
      },
    ),
  )
  return {
    password,
    fhNumber: registered.fhNumber,
    sessionToken: session.sessionToken,
    accountId: registered.id,
    deviceNumber: device.deviceNumber,
  }
}

function authOf(account) {
  return { sessionToken: account.sessionToken, deviceNumber: account.deviceNumber }
}

// --- the prescribed check ---------------------------------------------------

const health = await call(() => request('GET', API_HEALTH_URL))
check('GET /health answers ok', health.status === 'ok', `version ${health.version}`)

// --- error mapping ---------------------------------------------------------

const unauthorized = await captureApiError(() =>
  request('GET', '/me', undefined, { token: 'not-a-real-token' }),
)
check(
  'a bad token maps to a 401 ApiError with the server code',
  unauthorized?.status === 401 && unauthorized.code === 'unauthorized',
  `status=${unauthorized?.status} code=${unauthorized?.code}`,
)

// --- a served token --------------------------------------------------------

const alice = await createAccount('alice')
const bob = await createAccount('bob')
check('a fresh account registers its first device as number 1', alice.deviceNumber === 1)

const notFound = await captureApiError(() => resolveHandle(authOf(alice), 'nosuchhandle123'))
check(
  'an unknown handle maps to a 404 ApiError',
  notFound?.status === 404,
  `status=${notFound?.status} code=${notFound?.code}`,
)

const me = await call(() => getMe(authOf(alice)))
check(
  'GET /me returns the account with camelCase fields',
  me.id === alice.accountId && me.fhNumber === alice.fhNumber && me.totpEnabled === false,
  me.fhNumber,
)

const mismatched = await captureApiError(() =>
  getMe({ sessionToken: alice.sessionToken, deviceNumber: 99 }),
)
check(
  'a device header that disagrees with the session is rejected',
  mismatched?.status === 403,
  `status=${mismatched?.status}`,
)

const devices = await call(() => listOwnDevices(authOf(alice)))
check(
  'GET /devices lists the registered device',
  devices.length === 1 && devices[0].deviceNumber === 1 && devices[0].lastSeenAt === null,
  `${devices.length} device(s)`,
)

const prekeyStatus = await call(() => getPrekeyStatus(authOf(alice)))
check(
  'GET /devices/me/prekeys/status maps its four flags',
  prekeyStatus.oneTimeAvailable === 0 && prekeyStatus.hasSignedPrekey === false,
)

const saved = await call(() => getSavedConversation(authOf(alice)))
check(
  'GET /saved creates the saved conversation',
  saved.kind === 'saved' && saved.conversationId.length > 0,
  saved.conversationId,
)
const savedMessages = await call(() => getSavedMessages(authOf(alice)))
check('GET /saved/messages starts empty', Array.isArray(savedMessages) && savedMessages.length === 0)

const contact = await call(() =>
  addContact(authOf(alice), { targetFhNumber: bob.fhNumber, localUsername: 'bob' }),
)
check(
  'POST /contacts returns the mapped contact',
  contact.targetAccountId === bob.accountId && contact.localUsername === 'bob',
)
check('GET /contacts mirrors it', (await call(() => listContacts(authOf(alice)))).length === 1)

const direct = await call(() => createDirectConversation(authOf(alice), bob.fhNumber))
check('POST /conversations/direct returns an id', direct.id.length > 0 && direct.kind === 'direct')

const conversations = await call(() => listConversations(authOf(alice)))
const directEntry = conversations.find((conversation) => conversation.id === direct.id)
check(
  'GET /conversations maps memberCount and the nullable timestamps',
  directEntry?.kind === 'direct' &&
    directEntry.memberCount === 2 &&
    directEntry.title === null &&
    directEntry.archivedAt === null &&
    directEntry.mutedUntil === null,
  JSON.stringify(directEntry),
)
// The saved conversation is a conversation like any other, so it belongs in the
// list — a `kind` a client that only expected direct/group would mishandle.
const savedEntry = conversations.find((conversation) => conversation.id === saved.conversationId)
check(
  'and lists the saved conversation alongside it',
  savedEntry?.kind === 'saved',
  `${conversations.length} conversation(s)`,
)

const profile = await call(() => getAccountProfile(authOf(alice), bob.accountId))
check(
  'GET /accounts/{id}/profile maps isBlockedByMe and isContact',
  profile.id === bob.accountId && profile.isBlockedByMe === false && profile.isContact === true,
)

const presence = await call(() => getAccountPresence(authOf(alice), bob.accountId))
check(
  'GET /accounts/{id}/presence answers for a peer in a shared conversation',
  presence.accountId === bob.accountId && typeof presence.isOnline === 'boolean',
  `online=${presence.isOnline} visible=${presence.visible}`,
)

check('GET /blocks starts empty', (await call(() => listBlocks(authOf(alice)))).length === 0)
check(
  'GET /profile/presence-exceptions starts empty',
  (await call(() => listPresenceExceptions(authOf(alice)))).length === 0,
)

const sessions = await call(() => listSessions(authOf(alice)))
check(
  'GET /sessions marks the current session',
  sessions.length >= 1 && sessions.some((session) => session.isCurrent === true),
  `${sessions.length} session(s)`,
)

const ice = await call(() => getIceServers(authOf(alice)))
check(
  'GET /webrtc/ice-servers returns usable servers',
  Array.isArray(ice.iceServers) && ice.iceServers.length > 0 && ice.ttlSeconds > 0,
  `${ice.iceServers.length} server(s), ttl ${ice.ttlSeconds}s`,
)

console.log(`\nthrowaway accounts for cleanup: ${alice.fhNumber}, ${bob.fhNumber}`)
if (failures === 0) {
  console.log(`ALL ${checks} CHECKS PASSED`)
} else {
  console.log(`${failures} OF ${checks} CHECKS FAILED`)
}
process.exitCode = failures === 0 ? 0 : 1
