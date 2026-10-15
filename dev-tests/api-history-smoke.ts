import { historyChunks } from '../src/crypto/historyProtocol'
import { clearHistoryTransfers, receiveHistoryChunk } from '../src/crypto/historySync'
import { saveConversations } from '../src/storage/conversations'
import { getAttachment } from '../src/storage/attachments'
import { getHistoryMessagePage, getMessageByMessageId, saveMessages } from '../src/storage/messages'
import { useHistorySyncStore } from '../src/state/historySyncStore'
import type { Account, Envelope } from '../src/types'
import type { MessageRecord } from '../src/storage/db'

const accountId = '019a1234-1234-7000-8000-000000000001'
const conversationId = '019a1234-1234-7000-8000-000000000002'
const authorId = '019a1234-1234-7000-8000-000000000003'
const transferId = '019a1234-1234-7000-8000-000000000004'
const attachmentId = '019a1234-1234-7000-8000-000000000005'
const account: Account = { id: accountId, deviceNumber: 3, userId: 1, fhNumber: 'FH0000001', username: 'Test', avatarUrl: null, totpEnabled: false, sessionToken: 'local-test-only', expiresAt: 9999999999 }
const envelope: Envelope = { envelopeId: transferId, senderAccountId: accountId, senderDeviceNumber: 2, recipientAccountId: accountId, recipientDeviceNumber: 3, envelopeType: 2, isPrekeyMessage: false, ciphertext: '', clientTimestamp: 1000, conversationId, senderIsBot: false }
const checks: string[] = []
function check(value: unknown, name: string): asserts value { if (!value) throw new Error(name); checks.push(name) }
async function deliver(kind: 'message' | 'attachment' | 'complete', id: string, value: unknown) {
  let count = 0
  for (const chunk of historyChunks(transferId, conversationId, kind, id, value)) count += (await receiveHistoryChunk(account, envelope, chunk)).length
  return count
}
function message(id: string, text = 'Original') {
  return { message: { kind: 'message', message_id: id, text, reply_to: null, forward_from: null, attachment_ids: [attachmentId], created_at: 1000 },
    sender_account_id: authorId, sender_device_number: 7, server_timestamp: 1005, edited_at: 1004,
    reactions: [{ actor_id: authorId, emoji: '👍', created_at: 1006 }] }
}
async function run() {
  await saveConversations([{ id: conversationId, accountId, kind: 'direct', title: null, avatarUrl: null, memberCount: 2, lastEnvelopeAt: 1000, createdAt: 1000, updatedAt: 1000, archivedAt: null, mutedUntil: null }])
  useHistorySyncStore.getState().start(accountId, 2, [conversationId])
  await deliver('complete', conversationId, { message_count: 2 })
  check(useHistorySyncStore.getState().accounts[accountId]?.status !== 'complete', 'completion waits for all announced messages')
  await deliver('attachment', attachmentId, { attachment_id: attachmentId, key_hex: 'ab'.repeat(32), base_nonce_hex: 'cd'.repeat(4), file_name: 'photo.webp', content_type: 'image/webp', total_size: 1024, chunk_count: 1, kind: 'attachment' })
  check((await getAttachment(accountId, attachmentId))?.keyHex === 'ab'.repeat(32), 'attachment key survives real IndexedDB persistence')
  check(await deliver('message', 'logical-one', message('logical-one')) === 1, 'message imported once')
  check(await deliver('message', 'logical-one', message('logical-one', 'Stale replacement')) === 0, 'logical message deduplication preserves live local text')
  const record = await getMessageByMessageId(accountId, conversationId, 'logical-one')
  check(record?.senderAccountId === authorId && record.recipientDeviceNumber === 3 && record.plaintext === 'Original' && record.editedAt === 1004 && record.reactions[0]?.emoji === '👍', 'original author, edits, reactions and local routing survive import')
  await deliver('message', 'logical-two', message('logical-two'))
  check(useHistorySyncStore.getState().accounts[accountId]?.status === 'complete', 'completion arrives only after all logical messages')
  const rows: MessageRecord[] = Array.from({ length: 150 }, (_, index) => ({ ...record!, envelopeId: `019a1234-1234-7000-9000-${String(index).padStart(12, '0')}`, messageId: `page-${index}`, clientTimestamp: 2000, attachments: [] }))
  await saveMessages(rows)
  const first = await getHistoryMessagePage(accountId, conversationId)
  const last = first.at(-1)!
  const second = await getHistoryMessagePage(accountId, conversationId, { timestamp: last.clientTimestamp, envelopeId: last.envelopeId })
  const ids = new Set([...first, ...second].map((entry) => entry.envelopeId))
  check(first.length === 100 && second.length === 52 && ids.size === 152, 'equal-timestamp source pages have no gaps or duplicate boundary rows')
  clearHistoryTransfers(accountId)
  return checks
}
void run().then((passed) => fetch('/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, checks: passed }) }))
  .catch((error: unknown) => fetch('/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: error instanceof Error ? error.stack : String(error), checks }) }))
