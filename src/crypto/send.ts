import { getConversation } from '../api/conversations'
import { getSavedConversation } from '../api/saved'
import type { MessageRecord } from '../storage/db'
import { saveMessage } from '../storage/messages'
import type { Account, Envelope, ForwardRef, MessageStatus, ReplyRef } from '../types'
import { nowSeconds } from '../utils/time'
import { uuidV7 } from '../utils/uuid'
import { groupEncrypt } from '../wasm'
import { requireActiveClient } from '../ws/activeClient'
import { ENVELOPE_TYPE_MESSAGE } from '../ws/envelopeTypes'
import {
  buildEnvelope,
  pairwiseFanout,
  pairwiseFanoutOrThrow,
  resolveOwnOtherDevices,
  resolvePeerDevices,
} from './envelopes'
import { resolveGroupMemberAccounts } from './groups'
import { encodePayload, toWireForward, toWireReply, type MessagePayload } from './payloads'
import { persistSnapshot } from './snapshot'

/**
 * Outgoing messages: pairwise fan-out, group fan-out and Saved Messages.
 *
 * Two identifiers travel with every message. `messageId` is the logical one —
 * generated here, once, and identical in the copy every device receives — and
 * `envelopeId` identifies one delivery to one device. Everything that later
 * refers to "this message" (a reply, an edit, a reaction) uses the first;
 * only acknowledgement and receipts use the second.
 */

export type MessageDraft = {
  text: string
  replyTo?: ReplyRef | null
  forwardFrom?: ForwardRef | null
  attachmentIds?: string[]
}

export type SendResult = {
  messageId: string
  /** Every envelope that went out, this account's own devices included. */
  envelopes: Envelope[]
  /** The row written locally for this device's own copy. */
  message: MessageRecord
}

export type DirectTarget = {
  conversationId: string
  peerAccountId: string
}

/**
 * When the message was written.
 *
 * Only the offline queue passes this: a message typed in a tunnel should keep
 * the place it was typed in, not jump to the moment the connection returned.
 */
export type SendOptions = {
  createdAt?: number
}

/**
 * Finds the other member of a direct conversation.
 *
 * The conversation list carries no peer id, so the detail endpoint is the only
 * way to learn who to encrypt for.
 */
export async function resolveDirectPeer(account: Account, conversationId: string): Promise<string> {
  const detail = await getConversation(account, conversationId)
  const peerAccountId = detail.members.find((member) => member !== account.id)
  if (peerAccountId === undefined) {
    throw new Error(`[crypto] conversation ${conversationId} has no other member`)
  }
  return peerAccountId
}

/** Sends one drafted message to every device of the peer, and to our own. */
export async function sendMessage(
  account: Account,
  target: DirectTarget,
  draft: MessageDraft,
  options: SendOptions = {},
): Promise<SendResult> {
  const devices = await resolvePeerDevices(account, target.peerAccountId)
  if (devices.length === 0) {
    throw new Error(`[crypto] ${target.peerAccountId} has no devices to encrypt for`)
  }

  const messageId = uuidV7()
  const createdAt = options.createdAt ?? nowSeconds()
  const payloadHex = encodePayload(buildMessagePayload(messageId, draft, createdAt))

  // A device of the peer that cannot be given a session is left out rather than
  // failing the message; see `pairwiseFanout`.
  const envelopes = await pairwiseFanoutOrThrow(
    account,
    target.peerAccountId,
    devices,
    payloadHex,
    ENVELOPE_TYPE_MESSAGE,
    target.conversationId,
  )
  envelopes.push(...(await ownDeviceCopies(account, payloadHex, ENVELOPE_TYPE_MESSAGE, target.conversationId)))

  await uploadBatch(envelopes)
  await persistSnapshot(account.id)

  const message = buildLocalMessageRecord(account, {
    conversationId: target.conversationId,
    messageId,
    envelopeId: envelopes.at(0)?.envelopeId ?? uuidV7(),
    draft,
    createdAt,
  })
  return { messageId, envelopes, message }
}

/**
 * Encrypts once for the whole group and fans the same ciphertext out to every
 * member device.
 *
 * This account's *other* devices get a pairwise copy instead: they are members
 * of the conversation, but the sender key that opens a group message goes to
 * everyone except us, so they could not read the group ciphertext.
 */
export async function sendGroupMessage(
  account: Account,
  conversationId: string,
  draft: MessageDraft,
  options: SendOptions = {},
): Promise<SendResult> {
  const memberAccountIds = await resolveGroupMemberAccounts(account, conversationId)

  const messageId = uuidV7()
  const createdAt = options.createdAt ?? nowSeconds()
  const payloadHex = encodePayload(buildMessagePayload(messageId, draft, createdAt))

  const ciphertextHex = await groupEncrypt(
    account.id,
    account.deviceNumber,
    conversationId,
    payloadHex,
  )

  const envelopes: Envelope[] = []
  for (const memberAccountId of memberAccountIds) {
    for (const device of await resolvePeerDevices(account, memberAccountId)) {
      envelopes.push(
        buildEnvelope({
          senderAccountId: account.id,
          senderDeviceNumber: account.deviceNumber,
          recipientAccountId: memberAccountId,
          recipientDeviceNumber: device.deviceNumber,
          envelopeType: ENVELOPE_TYPE_MESSAGE,
          // Not a prekey message: the session that matters is the sender key.
          isPrekeyMessage: false,
          ciphertextHex,
          conversationId,
        }),
      )
    }
  }
  envelopes.push(...(await ownDeviceCopies(account, payloadHex, ENVELOPE_TYPE_MESSAGE, conversationId)))

  await uploadBatch(envelopes)
  await persistSnapshot(account.id)

  const message = buildLocalMessageRecord(account, {
    conversationId,
    messageId,
    envelopeId: envelopes.at(0)?.envelopeId ?? uuidV7(),
    draft,
    createdAt,
  })
  return { messageId, envelopes, message }
}

export type SavedSendResult = {
  conversationId: string
  message: MessageRecord
  envelopes: Envelope[]
}

/**
 * Sends a message to Saved Messages.
 *
 * Saved is a conversation with this account, so the recipients are exactly this
 * account's *other* devices — there is no sync step, because those envelopes are
 * the sync. The current device keeps the plaintext and writes it locally, and a
 * single-device account simply uploads nothing.
 */
export async function sendToSaved(
  account: Account,
  draft: MessageDraft,
  conversationId?: string,
  options: SendOptions = {},
): Promise<SavedSendResult> {
  const saved = conversationId ?? (await getSavedConversation(account)).conversationId

  const messageId = uuidV7()
  const createdAt = options.createdAt ?? nowSeconds()
  const payloadHex = encodePayload(buildMessagePayload(messageId, draft, createdAt))

  const envelopes = await ownDeviceCopies(account, payloadHex, ENVELOPE_TYPE_MESSAGE, saved)
  if (envelopes.length > 0) {
    await uploadBatch(envelopes)
  }

  const message = buildLocalMessageRecord(account, {
    conversationId: saved,
    messageId,
    envelopeId: envelopes.at(0)?.envelopeId ?? uuidV7(),
    draft,
    createdAt,
  })
  await saveMessage(message)
  await persistSnapshot(account.id)

  return { conversationId: saved, message, envelopes }
}

export type LocalRecordInput = {
  conversationId: string
  messageId: string
  envelopeId: string
  draft: MessageDraft
  createdAt: number
  /** `sending` for a message queued offline; `sent` once it is on its way. */
  status?: MessageStatus
}

/**
 * The row for a message this device just created.
 *
 * `serverTimestamp` starts at the local clock because there is nothing else yet
 * — the real one arrives with the upload receipt, and until then a message
 * simply under-claims rather than over-claims how far it has got.
 */
export function buildLocalMessageRecord(
  account: Account,
  input: LocalRecordInput,
): MessageRecord {
  return {
    messageId: input.messageId,
    envelopeId: input.envelopeId,
    accountId: account.id,
    conversationId: input.conversationId,
    senderAccountId: account.id,
    senderDeviceNumber: account.deviceNumber,
    recipientAccountId: account.id,
    recipientDeviceNumber: account.deviceNumber,
    envelopeType: ENVELOPE_TYPE_MESSAGE,
    plaintext: input.draft.text,
    decryptedAt: input.createdAt,
    clientTimestamp: input.createdAt,
    serverTimestamp: input.createdAt,
    attachments: input.draft.attachmentIds ?? [],
    replyTo: input.draft.replyTo ?? null,
    forwardFrom: input.draft.forwardFrom ?? null,
    editedAt: null,
    isPinned: false,
    reactions: [],
    status: input.status ?? 'sent',
  }
}

function buildMessagePayload(
  messageId: string,
  draft: MessageDraft,
  createdAt: number,
): MessagePayload {
  return {
    kind: 'message',
    message_id: messageId,
    text: draft.text,
    reply_to: toWireReply(draft.replyTo ?? null),
    forward_from: toWireForward(draft.forwardFrom ?? null),
    attachment_ids: draft.attachmentIds ?? [],
    created_at: createdAt,
  }
}

/**
 * The same payload, to this account's other devices.
 *
 * They receive a real message envelope rather than a special sync kind, and
 * recognise it as their own account's by `sender_account_id`. That is what makes
 * one rule cover a sent message, an edit, a delete and a reaction alike.
 *
 * Best effort, unlike the peer's devices: a copy of our own that cannot be
 * delivered costs a sync, and the message itself is already on its way.
 */
export async function ownDeviceCopies(
  account: Account,
  payloadHex: string,
  envelopeType: number,
  conversationId: string | null,
): Promise<Envelope[]> {
  const others = await resolveOwnOtherDevices(account)
  // Not the throwing variant: a copy of our own that cannot be delivered costs a
  // sync, and the message itself is already on its way to the peer.
  const { envelopes } = await pairwiseFanout(
    account,
    account.id,
    others,
    payloadHex,
    envelopeType,
    conversationId,
  )
  return envelopes
}

/**
 * One upload per logical message.
 *
 * The server stamps every envelope in one upload with the same
 * `server_timestamp`, and a read marker is compared against exactly that value —
 * so two messages sharing a batch would be marked read together. An empty batch
 * is skipped: the server has nothing to acknowledge, and the call would only
 * cost a round trip.
 */
async function uploadBatch(envelopes: Envelope[]): Promise<void> {
  if (envelopes.length === 0) {
    return
  }
  await requireActiveClient().uploadEnvelopes(envelopes)
}
