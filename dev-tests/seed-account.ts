/**
 * Seeds a signed-in session for screenshots and DOM checks.
 *
 * It logs in for real with the throwaway account in `scripts/.smoke-account.json`
 * (the credentials arrive in the URL hash from `dev-tests/run.mjs`) and stores
 * the account through the application's own storage layer, so the app under test
 * later sees exactly what a normal login would have written. The theme and
 * language are written where the app's pre-paint bootstrap reads them, which is
 * why they survive into the second page load this harness then screenshots.
 */
import { getMe, login } from '../src/api/auth'
import { API_BASE_URL } from '../src/api/client'
import { applyDocumentLanguage, isLanguage, persistLanguage } from '../src/i18n/language'
import { saveAccount } from '../src/storage/accounts'
import type { MessageRecord } from '../src/storage/db'
import { saveMessages } from '../src/storage/messages'
import { markConversationUnread } from '../src/storage/read_state'
import { pinMessage } from '../src/storage/pinned'
import { applyTheme, isTheme, persistTheme } from '../src/theme/theme'

const params = new URLSearchParams(location.hash.replace(/^#/, ''))

/** Which phase the flow was in, for the error report. */
let step = 'start'

async function report(payload: Record<string, unknown>): Promise<void> {
  // Also into the page, so a `--dump-dom` run shows why seeding failed instead of
  // leaving the harness waiting for a message that is never sent.
  const output = document.getElementById('out')
  if (output !== null) {
    output.textContent = JSON.stringify(payload, null, 2)
  }

  const resultUrl = params.get('result')
  if (resultUrl === null) {
    return
  }

  try {
    await fetch(resultUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    // Reporting is a convenience for whoever is watching; a failure to report
    // must not abort the flow it is reporting on.
    console.warn('[seed] could not deliver the report', error)
  }
}

async function main(): Promise<void> {
  const fhNumber = params.get('fh')
  const password = params.get('password')
  const deviceNumber = Number.parseInt(params.get('device') ?? '1', 10)
  const theme = params.get('theme')
  const language = params.get('lang')

  if (isTheme(theme)) {
    applyTheme(theme)
    persistTheme(theme)
  }
  if (isLanguage(language)) {
    applyDocumentLanguage(language)
    persistLanguage(language)
  }

  if (fhNumber === null || password === null) {
    await report({ ok: false, error: 'the URL carries no credentials' })
    return
  }

  step = 'login'
  const session = await login(fhNumber, password, deviceNumber)
  if (session.kind !== 'session') {
    await report({ ok: false, error: 'login asked for a TOTP code' })
    return
  }

  step = 'me'
  const me = await getMe({ sessionToken: session.sessionToken, deviceNumber })
  step = 'save'
  await saveAccount({
    id: me.id,
    userId: me.userId,
    fhNumber: me.fhNumber,
    username: me.username,
    avatarUrl: me.avatarUrl,
    totpEnabled: me.totpEnabled,
    deviceNumber,
    sessionToken: session.sessionToken,
    expiresAt: session.expiresAt,
  })

  step = 'messages'
  const seedChat = params.get('seedChat')
  if (seedChat !== null) {
    // `seedUnread` clears the read marker for the seeded conversation, so a
    // capture can depend on there being something unread. The browser profile —
    // and therefore IndexedDB — is reused between runs, so without this a
    // marker written by an earlier run would make the state depend on run order
    // and the check would quietly pass for the wrong reason.
    await seedConversation(me.id, seedChat, params.get('seedUnread') === '1')
  }

  step = 'done'
  await report({ ok: true, accountId: me.id, username: me.username, fhNumber: me.fhNumber })

  // One Edge launch per capture: the browser navigates on to the app itself, so
  // the harness never has to start a second instance in the same profile (which
  // would silently forward the URL to this one and exit with no output).
  const next = params.get('next')
  if (next !== null) {
    location.replace(next)
  }
}

/**
 * Writes a small conversation straight into IndexedDB.
 *
 * The chat view reads stored records, so rendering it needs some — and going
 * through the real crypto path would mean a second account, envelopes and a
 * socket, none of which the screenshot is about. What this proves is that the
 * transcript, the day separators, the status icons, the reactions and the pinned
 * banner render from the shape the receive path actually writes.
 */
async function seedConversation(
  accountId: string,
  conversationId: string,
  unread = false,
): Promise<void> {
  const minute = 60
  const hour = 3_600
  const day = 24 * hour
  const now = Math.floor(Date.now() / 1000)
  const startOfToday = Math.floor(new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000)
  // Clamped to the current day: without it, seeding just after midnight would
  // put every "today" message in yesterday's group and the separator under test
  // would never appear.
  const todayAt = (minutesAgo: number): number =>
    Math.max(now - minutesAgo * minute, startOfToday + 1)
  // Any id that is not this account's: the transcript decides which side a
  // bubble sits on by comparing the sender with the reader.
  const peerId = '00000000-0000-7000-8000-000000000001'

  const build = (
    suffix: string,
    at: number,
    senderAccountId: string,
    plaintext: string,
    extra: Partial<MessageRecord> = {},
  ): MessageRecord => ({
    // Both identifiers, as the payload contract requires: the logical one is
    // what an edit or a reaction would address, the envelope one is the store's
    // key. Seeded rows are their own origin, so nothing else pairs them up.
    messageId: `seed-msg-${suffix}`,
    envelopeId: `seed-${suffix}`,
    accountId,
    conversationId,
    senderAccountId,
    senderDeviceNumber: 1,
    recipientAccountId: accountId,
    recipientDeviceNumber: 1,
    envelopeType: 1,
    plaintext,
    decryptedAt: at,
    clientTimestamp: at,
    serverTimestamp: at,
    attachments: [],
    replyTo: null,
    forwardFrom: null,
    editedAt: null,
    isPinned: false,
    reactions: [],
    status: senderAccountId === accountId ? 'delivered' : 'sent',
    ...extra,
  })

  const messages: MessageRecord[] = [
    build('1', startOfToday - day + 12 * hour, peerId, 'Привет! Как дела?'),
    build('2', startOfToday - day + 13 * hour, accountId, 'Всё хорошо, спасибо 🙂'),
    build('3', startOfToday - day + 14 * hour, peerId, 'Ссылка, которую обещал: https://example.com/docs'),
    build('4', todayAt(30), accountId, 'Проверил, всё работает.', { status: 'read' }),
    build('5', todayAt(20), peerId, 'Отлично!', {
      reactions: [{ actorId: accountId, emoji: '👍', createdAt: todayAt(19) }],
    }),
    build('6', todayAt(10), accountId, 'Завтра обсудим детали.', {
      status: 'sent',
      editedAt: todayAt(9),
    }),
  ]

  await saveMessages(messages)
  await pinMessage(accountId, conversationId, 'seed-msg-3', 'seed-3')

  if (unread) {
    // Deleting the marker means "never read", which makes every incoming
    // message count — the state this conversation is being seeded to be in.
    await markConversationUnread(accountId, conversationId)
  }
}

/**
 * Enough of an error to diagnose it from a DOM dump: the class, the message and
 * whatever it carries as a cause. A bare `String(error)` hides all three — an
 * error that stringifies to something unhelpful is worse than no report.
 */
function describeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 4).join(' | ') ?? null,
      cause: error.cause === undefined ? null : describeError(error.cause),
    }
  }
  return { name: typeof error, message: JSON.stringify(error) }
}

void main().catch((error: unknown) => {
  void report({ ok: false, base: API_BASE_URL, step, error: describeError(error) })
})
