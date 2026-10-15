import type { ConversationEnvelope } from '../api/conversations'
import { getMessage, getMessageByMessageId, saveMessage } from '../storage/messages'
import type { MessageRecord } from '../storage/db'
import type { Account, Envelope } from '../types'
import { ENVELOPE_TYPE_ATTACHMENT_KEY, ENVELOPE_TYPE_MESSAGE, ENVELOPE_TYPE_SENDER_KEY, ENVELOPE_TYPE_SYNC } from '../ws/envelopeTypes'
import { buildMessageRecord, handleEnvelope } from './receive'
import { runReceiveWork } from './receiveQueue'

export const DEVICE_HISTORY_PAGE_SIZE = 200
export type HistoryPageResult = { messages: MessageRecord[]; existing: number; unavailable: number; ignored: number }

/**
 * Best effort only: spent Signal keys cannot be recreated from ciphertext.
 * Existing rows retain their edits/reactions. Historical controls and calls are
 * not replayed over newer local state; own-device sync transfers the final state.
 */
export async function restoreEnvelopePage(account: Account, conversationId: string,
  rows: ConversationEnvelope[], decode = handleEnvelope): Promise<HistoryPageResult> {
  const result: HistoryPageResult = { messages: [], existing: 0, unavailable: 0, ignored: 0 }
  const allowed = new Set([ENVELOPE_TYPE_MESSAGE, ENVELOPE_TYPE_SYNC, ENVELOPE_TYPE_SENDER_KEY, ENVELOPE_TYPE_ATTACHMENT_KEY])
  const ordered = [...rows].sort((a, b) => a.serverTimestamp - b.serverTimestamp || a.envelopeId.localeCompare(b.envelopeId))
  for (const row of ordered) {
    await runReceiveWork(account.id, async () => {
      if (row.conversationId !== conversationId || row.recipientDeviceNumber !== account.deviceNumber) {
        result.unavailable++; return
      }
      if (await getMessage(account.id, row.envelopeId)) { result.existing++; return }
      if (!allowed.has(row.envelopeType)) { result.ignored++; return }
      try {
        const envelope: Envelope = { ...row, recipientAccountId: account.id, senderIsBot: false }
        const received = await decode(account, envelope)
        if (received.kind !== 'message') {
          if (received.kind !== 'sender_key' && received.kind !== 'attachment_key') result.ignored++
          return
        }
        if (await getMessageByMessageId(account.id, conversationId, received.payload.message_id)) {
          result.existing++; return
        }
        const record = buildMessageRecord(account, conversationId, envelope, received.payload, 'sent', row.serverTimestamp)
        await saveMessage(record)
        result.messages.push(record)
      } catch {
        result.unavailable++
      }
    })
  }
  return result
}
