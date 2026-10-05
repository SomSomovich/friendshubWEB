/**
 * Storage-layer checks that must run in a browser: IndexedDB and the Web Locks
 * API do not exist in Node, and shimming them would test the shim.
 *
 * Driven by `dev-tests/run.mjs`, which loads this page twice:
 *   #write  — starts from a clean database, exercises every store, purges one account
 *   #verify — a second page load, so anything it still finds came from disk
 */
import { listAccounts, getAccount, purgeAccount, saveAccount } from '../src/storage/accounts'
import { getAttachment, saveAttachment, setAttachmentKey } from '../src/storage/attachments'
import { loadSnapshot, saveSnapshot } from '../src/storage/crypto_state'
import { getConversation, listConversations, saveConversations } from '../src/storage/conversations'
import { deleteDatabase, openDatabase } from '../src/storage/db'
import {
  DEVICES_CACHE_TTL_MS,
  getCachedDevices,
  putCachedDevices,
} from '../src/storage/devices_cache'
import {
  addReaction,
  countIncomingAfter,
  deleteMessage,
  getMessage,
  getMessageByMessageId,
  getMessages,
  removeReaction,
  saveMessages,
  updateMessage,
  updateServerTimestamp,
  updateStatus,
} from '../src/storage/messages'
import { listPinned, pinMessage, unpinMessage } from '../src/storage/pinned'
import { getSetting, setSetting } from '../src/storage/settings'
import { encodePayload, parseKnownPayload } from '../src/crypto/payloads'
import { hexToUtf8 } from '../src/utils/hex'
import { activeTypers, TYPING_TTL_SECONDS, withTyping, type TypingState } from '../src/utils/typing'

type Check = { name: string; passed: boolean; detail?: string }

const ACCOUNT_A = 'acc-a'
const ACCOUNT_B = 'acc-b'
const CONV_A1 = 'conv-a1'
const CONV_A2 = 'conv-a2'
const CONV_A3 = 'conv-a3'
const CONV_B1 = 'conv-b1'
const SETTING_KEY = 'smoke.cursor'
const SETTING_VALUE = 'cursor-42'

const checks: Check[] = []

function check(name: string, passed: boolean, detail?: string): void {
  checks.push(detail === undefined ? { name, passed } : { name, passed, detail })
}

function sameList(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index])
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms))
}

function conversation(id: string, accountId: string, updatedAt: number) {
  return {
    id,
    accountId,
    kind: 'direct' as const,
    title: null,
    memberCount: 2,
    lastEnvelopeAt: updatedAt,
    createdAt: 1,
    updatedAt,
    archivedAt: null,
    mutedUntil: null,
  }
}

function message(
  envelopeId: string,
  accountId: string,
  conversationId: string,
  clientTimestamp: number,
  senderAccountId: string = accountId,
) {
  return {
    // One logical id per message, one envelope per delivery: the ids differ in
    // production and the store must not assume they are the same string.
    messageId: `msg-${envelopeId}`,
    envelopeId,
    accountId,
    conversationId,
    senderAccountId,
    senderDeviceNumber: 1,
    recipientAccountId: 'peer',
    recipientDeviceNumber: 1,
    envelopeType: 1,
    plaintext: null,
    decryptedAt: null,
    clientTimestamp,
    serverTimestamp: clientTimestamp,
    attachments: [],
    replyTo: null,
    forwardFrom: null,
    isPinned: false,
    reactions: [],
    status: 'sent' as const,
  }
}

/**
 * Builds the database as the previous version left it, then lets the app open it.
 *
 * This is the path every existing install takes on the first load after an
 * update, and it is the only one that can silently lose a message history — so
 * it is exercised here rather than reconstructed on trust.
 */
async function seedLegacyDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('friendshub', 1)
    request.onerror = () => reject(request.error ?? new Error('could not open the old database'))
    request.onupgradeneeded = () => {
      const database = request.result
      database.createObjectStore('accounts', { keyPath: 'id' })
      const conversations = database.createObjectStore('conversations', {
        keyPath: ['accountId', 'id'],
      })
      conversations.createIndex('byUpdated', ['accountId', 'updatedAt'])
      const messages = database.createObjectStore('messages', { keyPath: 'envelopeId' })
      messages.createIndex('byConversation', ['accountId', 'conversationId', 'clientTimestamp'])
      messages.createIndex('byConversationServer', ['accountId', 'conversationId', 'serverTimestamp'])
      database.createObjectStore('crypto_state', { keyPath: 'accountId' })
      const pinned = database.createObjectStore('pinned', {
        keyPath: ['accountId', 'conversationId', 'envelopeId'],
      })
      database.createObjectStore('settings', { keyPath: 'key' })
      database.createObjectStore('devices_cache', { keyPath: ['accountId', 'peerAccountId'] })
      const attachments = database.createObjectStore('attachments', {
        keyPath: ['accountId', 'id'],
      })
      attachments.createIndex('byConversation', ['accountId', 'conversationId'])

      // One message and one pin, in the shape the old contract wrote them.
      messages.put({
        ...message('legacy-1', ACCOUNT_A, CONV_A1, 500),
        messageId: undefined,
        replyToEnvelopeId: null,
        envelopeIdsByDevice: { 'peer:1': 'legacy-1' },
      })
      // Through the upgrade transaction's own store handle: a second
      // transaction cannot be started from inside a versionchange one.
      pinned.put({
        accountId: ACCOUNT_A,
        conversationId: CONV_A1,
        envelopeId: 'legacy-1',
        pinnedAt: 5,
      })
    }
    request.onsuccess = () => {
      request.result.close()
      resolve()
    }
  })
}

async function runMigrationChecks(): Promise<void> {
  await deleteDatabase()
  await seedLegacyDatabase()

  // Opening at the new version is what runs the upgrade.
  const database = await openDatabase()
  const message_ = (await database.get('messages', 'legacy-1')) as
    | (Record<string, unknown> & { messageId?: string })
    | undefined

  check(
    'an old message keeps its history and gains a logical id',
    message_?.messageId === 'legacy-1' && message_?.plaintext !== undefined,
    JSON.stringify(message_?.messageId),
  )
  check(
    'the fields the contract retired are gone',
    message_ !== undefined &&
      message_['replyToEnvelopeId'] === undefined &&
      message_['envelopeIdsByDevice'] === undefined,
  )
  check(
    'and the new index finds it by that id',
    (await getMessageByMessageId(ACCOUNT_A, CONV_A1, 'legacy-1'))?.envelopeId === 'legacy-1',
  )

  const pins = await listPinned(ACCOUNT_A, CONV_A1)
  check(
    'an old pin is re-keyed onto the logical id',
    pins.length === 1 && pins[0]?.messageId === 'legacy-1',
    JSON.stringify(pins),
  )
}

async function runWriteChecks(): Promise<void> {
  await runMigrationChecks()

  await deleteDatabase()
  const database = await openDatabase()

  const storeNames = [...database.objectStoreNames].sort()
  check(
    'schema creates every object store',
    sameList(storeNames, [
      'accounts',
      'attachments',
      'conversations',
      'crypto_state',
      'devices_cache',
      'messages',
      'pinned',
      'settings',
    ]),
    storeNames.join(','),
  )

  const conversationStore = database.transaction('conversations').store
  check(
    'conversations has the byUpdated index',
    [...conversationStore.indexNames].includes('byUpdated'),
    [...conversationStore.indexNames].join(','),
  )
  const messageStore = database.transaction('messages').store
  check(
    'messages has both timestamp indexes',
    ['byConversation', 'byConversationServer'].every((name) =>
      [...messageStore.indexNames].includes(name),
    ),
    [...messageStore.indexNames].join(','),
  )

  // --- accounts ---
  await saveAccount({
    id: ACCOUNT_A,
    userId: 1,
    fhNumber: 'FH0000001',
    username: 'A',
    avatarUrl: null,
    totpEnabled: false,
    deviceNumber: 1,
    sessionToken: 'token-a',
    expiresAt: 999,
  })
  await saveAccount({
    id: ACCOUNT_B,
    userId: 2,
    fhNumber: 'FH0000002',
    username: 'B',
    avatarUrl: null,
    totpEnabled: false,
    deviceNumber: 1,
    sessionToken: 'token-b',
    expiresAt: 999,
  })
  check('accounts round-trip', (await getAccount(ACCOUNT_A))?.fhNumber === 'FH0000001')
  check('accounts list both', (await listAccounts()).length === 2)

  // --- conversations ---
  await saveConversations([
    conversation(CONV_A1, ACCOUNT_A, 300),
    conversation(CONV_A2, ACCOUNT_A, 100),
    conversation(CONV_A3, ACCOUNT_A, 200),
    conversation(CONV_B1, ACCOUNT_B, 999),
  ])
  const accountAConversations = await listConversations(ACCOUNT_A)
  check(
    'conversations are scoped to the account and sorted by recent activity',
    sameList(
      accountAConversations.map((record) => record.id),
      [CONV_A1, CONV_A3, CONV_A2],
    ),
  )
  check('getConversation reads one record', (await getConversation(ACCOUNT_A, CONV_A2))?.updatedAt === 100)
  check('getConversation misses another account', (await getConversation(ACCOUNT_A, CONV_B1)) === null)

  // --- messages ---
  await saveMessages([
    message('e100', ACCOUNT_A, CONV_A1, 100),
    message('e101', ACCOUNT_A, CONV_A1, 101),
    message('e102', ACCOUNT_A, CONV_A1, 102),
    message('e103', ACCOUNT_A, CONV_A1, 103),
    message('e104', ACCOUNT_A, CONV_A1, 104),
    message('e200', ACCOUNT_A, CONV_A2, 50),
    message('eb1', ACCOUNT_B, CONV_B1, 10),
  ])
  check(
    'messages come back newest first',
    sameList(
      (await getMessages(ACCOUNT_A, CONV_A1)).map((record) => record.envelopeId),
      ['e104', 'e103', 'e102', 'e101', 'e100'],
    ),
  )
  check(
    'the first page respects the limit',
    sameList(
      (await getMessages(ACCOUNT_A, CONV_A1, { limit: 2 })).map((record) => record.envelopeId),
      ['e104', 'e103'],
    ),
  )
  check(
    'paging with an inclusive cursor repeats the boundary, never skips it',
    sameList(
      (await getMessages(ACCOUNT_A, CONV_A1, { until: 103, limit: 2 })).map(
        (record) => record.envelopeId,
      ),
      ['e103', 'e102'],
    ),
  )
  check(
    'messages from other conversations and accounts stay out',
    (await getMessages(ACCOUNT_A, CONV_A1, { limit: 99 })).length === 5,
  )
  check('getMessage refuses a cross-account read', (await getMessage(ACCOUNT_B, 'e100')) === null)

  // --- message mutations ---
  await updateStatus(ACCOUNT_A, 'e100', 'delivered')
  check('updateStatus persists', (await getMessage(ACCOUNT_A, 'e100'))?.status === 'delivered')
  await updateMessage(ACCOUNT_A, 'e100', { plaintext: 'hello', decryptedAt: 7 })
  const mutated = await getMessage(ACCOUNT_A, 'e100')
  check('updateMessage patches only the given fields', mutated?.plaintext === 'hello' && mutated?.envelopeType === 1)

  await addReaction(ACCOUNT_A, 'e100', { actorId: 'actor-x', emoji: '👍', createdAt: 1 })
  await addReaction(ACCOUNT_A, 'e100', { actorId: 'actor-x', emoji: '🔥', createdAt: 2 })
  const replaced = await getMessage(ACCOUNT_A, 'e100')
  check(
    'a repeated reaction replaces the previous emoji',
    replaced?.reactions.length === 1 && replaced.reactions[0]?.emoji === '🔥',
    JSON.stringify(replaced?.reactions),
  )
  await addReaction(ACCOUNT_A, 'e100', { actorId: 'actor-y', emoji: '❤️', createdAt: 3 })
  check('reactions from different actors accumulate', (await getMessage(ACCOUNT_A, 'e100'))?.reactions.length === 2)
  await removeReaction(ACCOUNT_A, 'e100', 'actor-x')
  const afterRemoval = await getMessage(ACCOUNT_A, 'e100')
  check(
    'removeReaction drops only that actor',
    afterRemoval?.reactions.length === 1 && afterRemoval.reactions[0]?.actorId === 'actor-y',
  )

  await deleteMessage(ACCOUNT_A, 'e104')
  check('deleteMessage removes the row', (await getMessage(ACCOUNT_A, 'e104')) === null)
  check('deleteMessage is account-scoped', (await getMessages(ACCOUNT_A, CONV_A1, { limit: 99 })).length === 4)

  // --- crypto state and its lock ---
  await saveSnapshot(ACCOUNT_A, 'snapshot-a1')
  await saveSnapshot(ACCOUNT_B, 'snapshot-b')
  check('snapshot round-trip', (await loadSnapshot(ACCOUNT_A)) === 'snapshot-a1')
  check('snapshots are per account', (await loadSnapshot(ACCOUNT_B)) === 'snapshot-b')

  let releaseHeldLock = () => {}
  const held = new Promise<void>((resolveHeld) => {
    releaseHeldLock = resolveHeld
  })
  const holding = navigator.locks.request('crypto_state_acc-a', async () => held)
  const blockedSave = saveSnapshot(ACCOUNT_A, 'snapshot-a2')
  await delay(200)
  const whileLocked = await loadSnapshot(ACCOUNT_A)
  releaseHeldLock()
  await holding
  await blockedSave
  const afterUnlock = await loadSnapshot(ACCOUNT_A)
  check('saveSnapshot waits for the account lock', whileLocked === 'snapshot-a1', `read ${whileLocked}`)
  check('and lands as soon as the lock is free', afterUnlock === 'snapshot-a2')

  // --- pinned ---
  await pinMessage(ACCOUNT_A, CONV_A1, 'msg-e101', 'e101')
  await pinMessage(ACCOUNT_A, CONV_A1, 'msg-e102', 'e102')
  const pins = await listPinned(ACCOUNT_A, CONV_A1)
  check(
    'pins are listed oldest first and scoped to the conversation',
    pins.length === 2 && pins[0]?.messageId === 'msg-e101' && pins[1]?.messageId === 'msg-e102',
  )
  check('pinning also flags the message', (await getMessage(ACCOUNT_A, 'e101'))?.isPinned === true)
  await unpinMessage(ACCOUNT_A, CONV_A1, 'msg-e101', 'e101')
  check('unpinning clears the flag', (await getMessage(ACCOUNT_A, 'e101'))?.isPinned === false)
  check('and removes the pin record', (await listPinned(ACCOUNT_A, CONV_A1)).length === 1)

  // --- the logical id, and the server stamp that read receipts compare against ---
  check(
    'a message is found by its logical id within its conversation',
    (await getMessageByMessageId(ACCOUNT_A, CONV_A1, 'msg-e103'))?.envelopeId === 'e103',
  )
  check(
    'and not from another conversation',
    (await getMessageByMessageId(ACCOUNT_A, CONV_A2, 'msg-e103')) === null,
  )
  check(
    'a receipt records the server stamp',
    (await updateServerTimestamp(ACCOUNT_A, 'e103', 5_000)) === true &&
      (await getMessage(ACCOUNT_A, 'e103'))?.serverTimestamp === 5_000,
  )
  check(
    'and a stamp equal to the stored one changes nothing',
    (await updateServerTimestamp(ACCOUNT_A, 'e103', 5_000)) === false,
  )

  // --- the unread badge counts only what somebody else wrote ---
  await saveMessages([message('in1', ACCOUNT_A, CONV_A3, 900, 'peer')])
  await saveMessages([message('own1', ACCOUNT_A, CONV_A3, 901)])
  check(
    'own messages are never unread',
    (await countIncomingAfter(ACCOUNT_A, CONV_A3, 0)) === 1,
    `${await countIncomingAfter(ACCOUNT_A, CONV_A3, 0)} counted`,
  )

  // --- the payload contract survives an encode and a decode ---
  const roundTrip = parseKnownPayload(
    JSON.parse(
      hexToUtf8(
        encodePayload({
          kind: 'message',
          message_id: 'm-1',
          text: 'привет',
          reply_to: { message_id: 'm-0', preview: 'previous', sender_account_id: 'acc-x' },
          forward_from: null,
          attachment_ids: ['a-1'],
          created_at: 1_700_000_000,
        }),
      ),
    ),
  )
  check(
    'a message payload survives the wire format',
    roundTrip?.kind === 'message' &&
      roundTrip.text === 'привет' &&
      roundTrip.reply_to?.message_id === 'm-0' &&
      roundTrip.attachment_ids[0] === 'a-1',
  )
  check(
    'a reaction with a null emoji parses as a removal',
    parseKnownPayload({ kind: 'reaction', target_message_id: 'm-1', emoji: null, created_at: 1 })
      ?.kind === 'reaction',
  )
  check('an unknown kind is refused rather than guessed at', parseKnownPayload({ kind: 'nope' }) === null)
  check(
    'a retracted field is refused too',
    parseKnownPayload({ kind: 'edit', target_envelope_id: 'e1', new_plaintext_hex: '00' }) === null,
  )

  // --- typing, which expires on its own because nothing says it stopped ---
  const now = 1_000
  let typing: TypingState = {}
  check('nobody is typing in a conversation with no entry', activeTypers(typing, CONV_A1, now).length === 0)

  typing = withTyping(typing, CONV_A1, 'peer-1', now + TYPING_TTL_SECONDS)
  check('a fresh indicator is shown', activeTypers(typing, CONV_A1, now).join() === 'peer-1')
  check('and only in its own conversation', activeTypers(typing, CONV_A2, now).length === 0)
  check(
    'and it expires without anything having to cancel it',
    activeTypers(typing, CONV_A1, now + TYPING_TTL_SECONDS).length === 0,
  )

  typing = withTyping(typing, CONV_A1, 'peer-2', now + TYPING_TTL_SECONDS)
  check(
    'a second person typing joins the first rather than replacing them',
    activeTypers(typing, CONV_A1, now).sort().join() === 'peer-1,peer-2',
  )

  // Two people, two different expiries: the older indicator goes while the
  // newer one stays, which is the case a single per-conversation timestamp
  // could not express.
  let staggered: TypingState = {}
  staggered = withTyping(staggered, CONV_A1, 'early', now + 2)
  staggered = withTyping(staggered, CONV_A1, 'late', now + TYPING_TTL_SECONDS)
  check(
    'an expired indicator drops out while a fresh one stays',
    activeTypers(staggered, CONV_A1, now + 3).join() === 'late',
    activeTypers(staggered, CONV_A1, now + 3).join(),
  )

  // --- settings ---
  await setSetting(SETTING_KEY, SETTING_VALUE)
  check('settings round-trip', (await getSetting(SETTING_KEY)) === SETTING_VALUE)
  check('a missing setting reads as null', (await getSetting('nope')) === null)

  // --- device cache ---
  await putCachedDevices(ACCOUNT_A, 'peer-1', [
    { deviceNumber: 1, registrationId: 11, identityKeyPub: 'aa' },
  ])
  check('device cache round-trip', (await getCachedDevices(ACCOUNT_A, 'peer-1'))?.length === 1)
  await database.put('devices_cache', {
    accountId: ACCOUNT_A,
    peerAccountId: 'peer-stale',
    devices: [],
    cachedAt: Date.now() - DEVICES_CACHE_TTL_MS - 1_000,
  })
  check('an expired device cache entry is a miss', (await getCachedDevices(ACCOUNT_A, 'peer-stale')) === null)
  check(
    'and the stale row is dropped',
    (await database.get('devices_cache', [ACCOUNT_A, 'peer-stale'])) === undefined,
  )

  // --- attachments ---
  await saveAttachment({
    id: 'att-1',
    accountId: ACCOUNT_A,
    conversationId: CONV_A1,
    totalSize: 10,
    chunkCount: 1,
    kind: 'attachment',
    keyHex: null,
    baseNonceHex: null,
    localPath: null,
  })
  await setAttachmentKey(ACCOUNT_A, 'att-1', 'key', 'nonce', CONV_A1)
  const attachment = await getAttachment(ACCOUNT_A, 'att-1')
  check('attachment key round-trip', attachment?.keyHex === 'key' && attachment?.baseNonceHex === 'nonce')

  // A key can arrive before the message that references it, so it is stored
  // against a placeholder row rather than dropped.
  await setAttachmentKey(ACCOUNT_A, 'ghost', 'k', 'n', CONV_A1)
  check(
    'a key for an unknown attachment creates a placeholder',
    (await getAttachment(ACCOUNT_A, 'ghost'))?.keyHex === 'k',
  )

  // --- purge ---
  await purgeAccount(ACCOUNT_A)
  check('purge removes the account record', (await getAccount(ACCOUNT_A)) === null)
  check('purge removes its conversations', (await listConversations(ACCOUNT_A)).length === 0)
  check('purge removes its messages', (await getMessages(ACCOUNT_A, CONV_A1, { limit: 99 })).length === 0)
  check('purge removes its crypto state', (await loadSnapshot(ACCOUNT_A)) === null)
  check('purge removes its pins', (await listPinned(ACCOUNT_A, CONV_A1)).length === 0)
  check('purge removes its device cache', (await getCachedDevices(ACCOUNT_A, 'peer-1')) === null)
  check('purge removes its attachments', (await getAttachment(ACCOUNT_A, 'att-1')) === null)
  check('purge leaves the other account alone', (await listAccounts()).length === 1)
  check('and leaves its data alone', (await getMessage(ACCOUNT_B, 'eb1')) !== null)
}

async function runVerifyChecks(): Promise<void> {
  const database = await openDatabase()
  check('the database survives a page load', [...database.objectStoreNames].length === 8)
  check('the purged account stayed purged', (await getAccount(ACCOUNT_A)) === null)
  check('its conversations stayed gone', (await listConversations(ACCOUNT_A)).length === 0)
  check('its crypto state stayed gone', (await loadSnapshot(ACCOUNT_A)) === null)
  check('the surviving account is intact', (await getAccount(ACCOUNT_B))?.fhNumber === 'FH0000002')
  check('with its conversation', (await getConversation(ACCOUNT_B, CONV_B1))?.memberCount === 2)
  check('its message', (await getMessage(ACCOUNT_B, 'eb1'))?.clientTimestamp === 10)
  check('and its snapshot', (await loadSnapshot(ACCOUNT_B)) === 'snapshot-b')
  check('settings persisted too', (await getSetting(SETTING_KEY)) === SETTING_VALUE)
}

async function report(mode: string): Promise<void> {
  const failed = checks.filter((entry) => !entry.passed)
  const lines = checks.map(
    (entry) => `${entry.passed ? 'PASS' : 'FAIL'} ${entry.name}${entry.detail ? ` (${entry.detail})` : ''}`,
  )
  const summary = failed.length === 0 ? `ALL ${checks.length} CHECKS PASSED` : `${failed.length} CHECK(S) FAILED`
  const text = [`--- ${mode} ---`, ...lines, summary].join('\n')

  const output = document.getElementById('out')
  if (output) {
    output.textContent = `${output.textContent}\n${text}`
  }
  document.title = `${mode}: ${failed.length === 0 ? 'pass' : 'fail'}`

  await fetch('/result', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ mode, total: checks.length, failures: failed.length, lines }),
  })
}

const mode = location.hash.replace('#', '') || 'write'
check('the harness received a valid mode', mode === 'write' || mode === 'verify', mode)

try {
  if (mode === 'write') {
    await runWriteChecks()
  } else {
    await runVerifyChecks()
  }
} catch (error) {
  // Never leave the runner waiting for a verdict: an unexpected throw is itself
  // a failed check, reported like any other.
  const detail = String(error && error.stack ? error.stack : error)
  check('the run finished without an unexpected error', false, detail.slice(0, 600))
}

await report(mode)
