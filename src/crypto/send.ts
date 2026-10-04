import { getConversation } from '../api/conversations'
import { getSavedConversation } from '../api/saved'
import type { MessageRecord } from '../storage/db'
import { saveMessage } from '../storage/messages'
import type { Account, Envelope } from '../types'
import { utf8ToHex } from '../utils/hex'
import { nowSeconds } from '../utils/time'
import { createSenderKeyDistribution, groupEncrypt } from '../wasm'
import { requireActiveClient } from '../ws/activeClient'
import { ENVELOPE_TYPE_MESSAGE, ENVELOPE_TYPE_SENDER_KEY, ENVELOPE_TYPE_SYNC } from '../ws/envelopeTypes'
import {
  buildEnvelope,
  encryptForDevice,
  resolveOwnOtherDevices,
  resolvePeerDevices,
  type SyncSentPayload,
} from './envelopes'
import { persistSnapshot } from './snapshot'

/**
 * Outgoing messages: pairwise fan-out, the sync copies that keep this account's
 * other devices in step, group fan-out and Saved Messages.
 */

export type SendResult = {
  /** Every envelope that was uploaded, including the sync copies. */
  envelopes: Envelope[]
  /** Ids of the envelopes addressed to the recipients (not the sync copies). */
  envelopeIds: string[]
}

export type DirectTarget = {
  conversationId: string
  peerAccountId: string
}

export type SendOptions = {
  /** `false` skips the copies sent to this account's other devices. */
  sync?: boolean
}

/** The sync payload shape the native clients emit (see `envelopes.ts`). */
export type { SyncSentPayload } from './envelopes'

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

/**
 * Sends one text message to every device of the peer, then syncs the copies.
 *
 * Each device needs its own ciphertext — pairwise sessions are per device — so
 * this is one encrypt per device, not one per message.
 */
export async function sendMessage(
  account: Account,
  target: DirectTarget,
  plaintext: string,
  options: SendOptions = {},
): Promise<SendResult> {
  const devices = await resolvePeerDevices(account, target.peerAccountId)
  if (devices.length === 0) {
    throw new Error(`[crypto] ${target.peerAccountId} has no devices to encrypt for`)
  }

  const plaintextHex = utf8ToHex(plaintext)
  const envelopes: Envelope[] = []

  for (const device of devices) {
    const encrypted = await encryptForDevice(
      account,
      target.peerAccountId,
      device.deviceNumber,
      plaintextHex,
    )
    envelopes.push(
      buildEnvelope({
        senderAccountId: account.id,
        senderDeviceNumber: account.deviceNumber,
        recipientAccountId: target.peerAccountId,
        recipientDeviceNumber: device.deviceNumber,
        envelopeType: ENVELOPE_TYPE_MESSAGE,
        isPrekeyMessage: encrypted.isPrekeyMessage,
        ciphertextHex: encrypted.ciphertextHex,
        conversationId: target.conversationId,
      }),
    )
  }

  await requireActiveClient().uploadEnvelopes(envelopes)
  await persistSnapshot(account.id)

  const syncEnvelopes =
    options.sync === false
      ? []
      : await sendSyncCopies(account, {
          kind: 'sync_sent',
          to_account: target.peerAccountId,
          to_devices: devices.map((device) => device.deviceNumber),
          conversation_id: target.conversationId,
          plaintext_hex: plaintextHex,
          envelope_ids: envelopes.map((envelope) => envelope.envelopeId),
        })

  return {
    envelopes: [...envelopes, ...syncEnvelopes],
    envelopeIds: envelopes.map((envelope) => envelope.envelopeId),
  }
}

export type SavedSendResult = {
  conversationId: string
  /** The row stored on this device; the other devices receive theirs over the wire. */
  message: MessageRecord
  envelopes: Envelope[]
}

/**
 * Sends a message to Saved Messages.
 *
 * Saved is a conversation with this account, so the recipients are exactly this
 * account's *other* devices — there is no sync step, because the envelopes are
 * the sync. The current device keeps the plaintext and writes it locally.
 */
export async function sendToSaved(
  account: Account,
  plaintext: string,
  conversationId?: string,
): Promise<SavedSendResult> {
  const saved = conversationId ?? (await getSavedConversation(account)).conversationId
  const others = await resolveOwnOtherDevices(account)
  const plaintextHex = utf8ToHex(plaintext)

  const envelopes: Envelope[] = []
  for (const device of others) {
    const encrypted = await encryptForDevice(account, account.id, device.deviceNumber, plaintextHex)
    envelopes.push(
      buildEnvelope({
        senderAccountId: account.id,
        senderDeviceNumber: account.deviceNumber,
        recipientAccountId: account.id,
        recipientDeviceNumber: device.deviceNumber,
        envelopeType: ENVELOPE_TYPE_MESSAGE,
        isPrekeyMessage: encrypted.isPrekeyMessage,
        ciphertextHex: encrypted.ciphertextHex,
        conversationId: saved,
      }),
    )
  }

  if (envelopes.length > 0) {
    await requireActiveClient().uploadEnvelopes(envelopes)
  }

  const message = buildLocalMessageRecord(
    account,
    saved,
    plaintext,
    // The first envelope is the identity this device will use for its own copy:
    // edits and reactions are addressed per envelope, and the sync payload lists
    // these ids for the account's other devices.
    envelopes[0]?.envelopeId,
  )
  await saveMessage(message)
  await persistSnapshot(account.id)

  return { conversationId: saved, message, envelopes }
}

/**
 * Encrypts once for the whole group and fans the same ciphertext out to every
 * member device.
 *
 * The sender key has to reach the members before the first group message can be
 * decrypted, so a distribution is sent for each conversation once per session —
 * after that the members hold it, and re-sending the same key on every message
 * would be pure traffic.
 */
export async function sendGroupMessage(
  account: Account,
  conversationId: string,
  plaintext: string,
  options: SendOptions = {},
): Promise<SendResult> {
  const memberAccountIds = await resolveGroupMemberAccounts(account, conversationId)
  await ensureSenderKeyDistributed(account, conversationId, memberAccountIds)

  const ciphertextHex = await groupEncrypt(
    account.id,
    account.deviceNumber,
    conversationId,
    utf8ToHex(plaintext),
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
          // A group message is not a prekey message: the session that matters is
          // the sender key, which was distributed above.
          isPrekeyMessage: false,
          ciphertextHex,
          conversationId,
        }),
      )
    }
  }

  if (envelopes.length > 0) {
    await requireActiveClient().uploadEnvelopes(envelopes)
  }
  await persistSnapshot(account.id)

  const syncEnvelopes =
    options.sync === false
      ? []
      : await sendSyncCopies(account, {
          kind: 'sync_sent',
          to_account: account.id,
          to_devices: [],
          conversation_id: conversationId,
          plaintext_hex: utf8ToHex(plaintext),
          envelope_ids: envelopes.map((envelope) => envelope.envelopeId),
        })

  return {
    envelopes: [...envelopes, ...syncEnvelopes],
    envelopeIds: envelopes.map((envelope) => envelope.envelopeId),
  }
}

/** Conversations whose sender key this session has already distributed. */
const distributedConversations = new Set<string>()

/**
 * Makes sure every member holds this device's sender key for a conversation.
 *
 * Called before the first group message, and again by the group-creation flow:
 * distributing it at creation means the members can read the first message the
 * moment it arrives, and the guard means the second call costs nothing.
 *
 * @param memberAccountIds the members, when the caller has already resolved
 *                         them — the send path has, and asking again would be a
 *                         second round trip for the same answer.
 */
export async function ensureSenderKeyDistributed(
  account: Account,
  conversationId: string,
  memberAccountIds?: string[],
): Promise<void> {
  if (distributedConversations.has(conversationId)) {
    return
  }

  const members = memberAccountIds ?? (await resolveGroupMemberAccounts(account, conversationId))
  const distribution = await createSenderKeyDistribution(
    account.id,
    account.deviceNumber,
    conversationId,
  )
  await distributeSenderKey(account, members, conversationId, distribution)
  distributedConversations.add(conversationId)
}

async function distributeSenderKey(
  account: Account,
  memberAccountIds: string[],
  conversationId: string,
  distributionHex: string,
): Promise<void> {
  const envelopes: Envelope[] = []
  for (const memberAccountId of memberAccountIds) {
    for (const device of await resolvePeerDevices(account, memberAccountId)) {
      const encrypted = await encryptForDevice(
        account,
        memberAccountId,
        device.deviceNumber,
        utf8ToHex(distributionHex),
      )
      envelopes.push(
        buildEnvelope({
          senderAccountId: account.id,
          senderDeviceNumber: account.deviceNumber,
          recipientAccountId: memberAccountId,
          recipientDeviceNumber: device.deviceNumber,
          envelopeType: ENVELOPE_TYPE_SENDER_KEY,
          isPrekeyMessage: encrypted.isPrekeyMessage,
          ciphertextHex: encrypted.ciphertextHex,
          conversationId,
        }),
      )
    }
  }

  if (envelopes.length > 0) {
    await requireActiveClient().uploadEnvelopes(envelopes)
  }
}

/** Group members other than this account. */
async function resolveGroupMemberAccounts(
  account: Account,
  conversationId: string,
): Promise<string[]> {
  const detail = await getConversation(account, conversationId)
  return detail.members.filter((member) => member !== account.id)
}

async function sendSyncCopies(account: Account, payload: SyncSentPayload): Promise<Envelope[]> {
  const others = await resolveOwnOtherDevices(account)
  if (others.length === 0) {
    return []
  }

  const payloadHex = utf8ToHex(JSON.stringify(payload))
  const envelopes: Envelope[] = []

  for (const device of others) {
    const encrypted = await encryptForDevice(account, account.id, device.deviceNumber, payloadHex)
    envelopes.push(
      buildEnvelope({
        senderAccountId: account.id,
        senderDeviceNumber: account.deviceNumber,
        recipientAccountId: account.id,
        recipientDeviceNumber: device.deviceNumber,
        envelopeType: ENVELOPE_TYPE_SYNC,
        isPrekeyMessage: encrypted.isPrekeyMessage,
        ciphertextHex: encrypted.ciphertextHex,
        conversationId: payload.conversation_id,
      }),
    )
  }

  await requireActiveClient().uploadEnvelopes(envelopes)
  return envelopes
}

/**
 * The row for a message this device just created.
 *
 * There is no server timestamp yet, and for Saved Messages no envelope arrives
 * back either, so the local clock is the only source — which is also why the
 * ordering fields are set from it rather than left at zero.
 *
 * `envelopeId` is one of the ids that actually went out, when the caller knows
 * it: an edit or a reaction is addressed by envelope id, and a local row that no
 * envelope id points at could never be matched to one.
 */
export function buildLocalMessageRecord(
  account: Account,
  conversationId: string,
  plaintext: string,
  envelopeId?: string,
  envelopeIdsByDevice?: Record<string, string>,
): MessageRecord {
  const timestamp = nowSeconds()
  return {
    envelopeId: envelopeId ?? crypto.randomUUID(),
    envelopeIdsByDevice,
    accountId: account.id,
    conversationId,
    senderAccountId: account.id,
    senderDeviceNumber: account.deviceNumber,
    recipientAccountId: account.id,
    recipientDeviceNumber: account.deviceNumber,
    envelopeType: ENVELOPE_TYPE_MESSAGE,
    plaintext,
    decryptedAt: timestamp,
    clientTimestamp: timestamp,
    serverTimestamp: timestamp,
    attachments: [],
    replyToEnvelopeId: null,
    editedAt: null,
    isPinned: false,
    reactions: [],
    status: 'sent',
  }
}
