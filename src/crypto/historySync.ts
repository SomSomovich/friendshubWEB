import { listOwnDevices } from '../api/devices'
import { listConversations } from '../api/conversations'
import { putCachedDevices } from '../storage/devices_cache'
import { getAttachment, saveAttachment } from '../storage/attachments'
import { getConversation } from '../storage/conversations'
import type { AttachmentRecord, MessageRecord } from '../storage/db'
import { getHistoryMessagePage, getMessageByMessageId, saveMessage, type HistoryMessageCursor } from '../storage/messages'
import { useHistorySyncStore } from '../state/historySyncStore'
import type { Account, Envelope, Reaction } from '../types'
import { nowSeconds } from '../utils/time'
import { isUuid, uuidV7 } from '../utils/uuid'
import type { WsClient } from '../ws/client'
import { ENVELOPE_TYPE_SYNC } from '../ws/envelopeTypes'
import type { HistoryRequestEvent } from '../ws/events'
import { pairwise } from './envelopes'
import { assembleHistoryChunk, clearHistoryFragments, historyChunks, type HistoryChunk } from './historyProtocol'
import { encodePayload, isRecord, parseKnownPayload, toDomainForward, toDomainReply, toWireForward, toWireReply } from './payloads'
import { persistSnapshot } from './snapshot'

export async function sendHistory(account: Account, request: HistoryRequestEvent, client: WsClient, runSerial: (work: () => Promise<void>) => Promise<void>): Promise<void> {
  if (request.fromDeviceNumber === account.deviceNumber || request.conversationIds.length > 200) throw new Error('invalid history target')
  const devices = await listOwnDevices(account)
  if (!devices.some((device) => device.deviceNumber === request.fromDeviceNumber)) throw new Error('history target is not an active own device')
  await putCachedDevices(account.id, account.id, devices.map(({ deviceNumber, registrationId, identityKeyPub }) => ({ deviceNumber, registrationId, identityKeyPub })))
  const conversations = await listConversations(account)
  const allowed = new Set(conversations.filter((conversation) => conversation.kind !== 'channel').map((conversation) => conversation.id))
  const transferId = uuidV7()
  async function sendItem(conversationId: string, kind: HistoryChunk['item_kind'], itemId: string, item: unknown): Promise<void> {
    for (const chunk of historyChunks(transferId, conversationId, kind, itemId, item)) {
      if (!client.isConnected) throw new Error('history transfer disconnected; request it again to resume')
      await runSerial(async () => {
        const envelope = await pairwise(account, account.id, request.fromDeviceNumber, encodePayload(chunk), ENVELOPE_TYPE_SYNC, conversationId)
        await persistSnapshot(account.id)
        await client.uploadEnvelopes([envelope])
      })
      // Leave room for ordinary messages below the server's frame-flood budget.
      await new Promise((resolve) => setTimeout(resolve, 40))
    }
  }
  for (const conversationId of [...new Set(request.conversationIds)]) {
    if (!allowed.has(conversationId)) throw new Error('history conversation is not accessible')
    let after: HistoryMessageCursor | undefined
    let count = 0
    const sentMessages = new Set<string>()
    const attachments = new Set<string>()
    for (;;) {
      const page = await getHistoryMessagePage(account.id, conversationId, after)
      if (page.length === 0) break
      for (const message of page) {
        if (message.plaintext === null || message.status === 'sending' || message.status === 'failed' || sentMessages.has(message.messageId)) continue
        sentMessages.add(message.messageId)
        for (const attachmentId of message.attachments) {
          if (attachments.has(attachmentId)) continue
          attachments.add(attachmentId)
          const attachment = await getAttachment(account.id, attachmentId)
          if (attachment?.keyHex && attachment.baseNonceHex) await sendItem(conversationId, 'attachment', attachmentId, {
            attachment_id: attachmentId, key_hex: attachment.keyHex, base_nonce_hex: attachment.baseNonceHex,
            file_name: attachment.fileName ?? null, content_type: attachment.contentType ?? null,
            total_size: attachment.totalSize, chunk_count: attachment.chunkCount, kind: attachment.kind,
          })
        }
        await sendItem(conversationId, 'message', message.messageId, {
          message: { kind: 'message', message_id: message.messageId, text: message.plaintext,
            reply_to: toWireReply(message.replyTo), forward_from: toWireForward(message.forwardFrom),
            attachment_ids: message.attachments, created_at: message.clientTimestamp },
          sender_account_id: message.senderAccountId, sender_device_number: message.senderDeviceNumber,
          server_timestamp: message.serverTimestamp, edited_at: message.editedAt ?? null,
          reactions: message.reactions.map((reaction) => ({ actor_id: reaction.actorId, emoji: reaction.emoji, created_at: reaction.createdAt })),
        })
        count++
      }
      const last = page.at(-1)
      if (!last) break
      after = { timestamp: last.clientTimestamp, envelopeId: last.envelopeId }
    }
    await sendItem(conversationId, 'complete', conversationId, { message_count: count })
  }
}

const completedItems = new Map<string, { messages: Set<string>; expected: number | null }>()

export function clearHistoryTransfers(accountId: string): void {
  clearHistoryFragments(accountId)
  for (const key of completedItems.keys()) if (key.startsWith(`${accountId}:`)) completedItems.delete(key)
}

function timestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** Only an authenticated own-device SYNC envelope may import historical authors. */
export async function receiveHistoryChunk(account: Account, envelope: Envelope, chunk: HistoryChunk): Promise<MessageRecord[]> {
  if (envelope.senderAccountId !== account.id || envelope.recipientAccountId !== account.id ||
    envelope.senderDeviceNumber === account.deviceNumber || envelope.conversationId !== chunk.conversation_id) throw new Error('history must come from another own device')
  const conversationId = chunk.conversation_id
  const conversation = await getConversation(account.id, conversationId)
  if (!conversation || conversation.kind === 'channel') throw new Error('history conversation is not available')
  const progress = useHistorySyncStore.getState()
  progress.touch(account.id, envelope.senderDeviceNumber, conversationId)
  const item = assembleHistoryChunk(account.id, envelope.senderDeviceNumber, chunk)
  if (item === undefined) return []
  if (!isRecord(item)) throw new Error('invalid history item')
  const transferKey = `${account.id}:${envelope.senderDeviceNumber}:${chunk.transfer_id}:${conversationId}`
  const completion = completedItems.get(transferKey) ?? { messages: new Set<string>(), expected: null }
  if (chunk.item_kind === 'complete') {
    if (!timestamp(item.message_count)) throw new Error('invalid history completion')
    completion.expected = item.message_count
    completedItems.set(transferKey, completion)
    if (completion.messages.size === completion.expected) {
      progress.touch(account.id, envelope.senderDeviceNumber, conversationId, 0, true)
      completedItems.delete(transferKey)
    }
    return []
  }
  if (chunk.item_kind === 'attachment') {
    if (item.attachment_id !== chunk.item_id || !isUuid(chunk.item_id) ||
      typeof item.key_hex !== 'string' || !/^[a-f0-9]{64}$/i.test(item.key_hex) ||
      typeof item.base_nonce_hex !== 'string' || !/^[a-f0-9]{8}$/i.test(item.base_nonce_hex) ||
      !timestamp(item.total_size) || !timestamp(item.chunk_count) || item.chunk_count > 500 ||
      !['attachment', 'thumbnail'].includes(String(item.kind)) ||
      !(item.file_name === null || typeof item.file_name === 'string' && item.file_name.length <= 4096) ||
      !(item.content_type === null || typeof item.content_type === 'string' && item.content_type.length <= 256)
    ) throw new Error('invalid history attachment')
    const existing = await getAttachment(account.id, chunk.item_id)
    const record: AttachmentRecord = { id: chunk.item_id, accountId: account.id, conversationId,
      kind: item.kind as AttachmentRecord['kind'], totalSize: item.total_size, chunkCount: item.chunk_count,
      keyHex: item.key_hex, baseNonceHex: item.base_nonce_hex,
      fileName: item.file_name as string | null, contentType: item.content_type as string | null, localPath: null }
    await saveAttachment(existing ? { ...record, ...existing,
      keyHex: existing.keyHex ?? record.keyHex, baseNonceHex: existing.baseNonceHex ?? record.baseNonceHex,
      fileName: existing.fileName ?? record.fileName, contentType: existing.contentType ?? record.contentType,
    } : record)
    return []
  }
  const payload = parseKnownPayload(item.message)
  if (payload?.kind !== 'message' || payload.message_id !== chunk.item_id ||
    typeof item.sender_account_id !== 'string' || !isUuid(item.sender_account_id) ||
    typeof item.sender_device_number !== 'number' || !Number.isSafeInteger(item.sender_device_number) || item.sender_device_number < 1 ||
    !timestamp(payload.created_at) || !timestamp(item.server_timestamp) || !(item.edited_at === null || timestamp(item.edited_at)) ||
    !Array.isArray(item.reactions) || item.reactions.length > 5000 ||
    !payload.attachment_ids.every(isUuid)
  ) throw new Error('invalid history message')
  const reactions: Reaction[] = item.reactions.map((reaction: unknown) => {
    if (!isRecord(reaction) || typeof reaction.actor_id !== 'string' || !isUuid(reaction.actor_id) ||
      typeof reaction.emoji !== 'string' || [...reaction.emoji].length > 16 || !timestamp(reaction.created_at)) throw new Error('invalid history reaction')
    return { actorId: reaction.actor_id, emoji: reaction.emoji, createdAt: reaction.created_at }
  })
  const finishItem = (): void => {
    completion.messages.add(payload.message_id)
    completedItems.set(transferKey, completion)
    if (completion.expected !== null && completion.messages.size === completion.expected) {
      progress.touch(account.id, envelope.senderDeviceNumber, conversationId, 0, true)
      completedItems.delete(transferKey)
    }
  }
  if (await getMessageByMessageId(account.id, conversationId, payload.message_id)) { finishItem(); return [] }
  const message: MessageRecord = { accountId: account.id, envelopeId: uuidV7(), messageId: payload.message_id,
    conversationId, senderAccountId: item.sender_account_id, senderDeviceNumber: item.sender_device_number,
    recipientAccountId: account.id, recipientDeviceNumber: account.deviceNumber, envelopeType: 1,
    plaintext: payload.text, clientTimestamp: payload.created_at, serverTimestamp: item.server_timestamp,
    decryptedAt: nowSeconds(), attachments: payload.attachment_ids, replyTo: toDomainReply(payload.reply_to),
    forwardFrom: toDomainForward(payload.forward_from), editedAt: item.edited_at as number | null,
    reactions, isPinned: false, status: 'sent' }
  await saveMessage(message)
  finishItem()
  progress.touch(account.id, envelope.senderDeviceNumber, conversationId, 1)
  return [message]
}
