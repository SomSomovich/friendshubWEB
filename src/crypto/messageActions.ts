import { getConversation } from '../api/conversations'
import type { MessageRecord } from '../storage/db'
import type { Account, Envelope } from '../types'
import { utf8ToHex } from '../utils/hex'
import { requireActiveClient } from '../ws/activeClient'
import {
  ENVELOPE_TYPE_DELETE,
  ENVELOPE_TYPE_EDIT,
  ENVELOPE_TYPE_REACTION,
} from '../ws/envelopeTypes'
import { buildEnvelope, encryptForDevice, resolveOwnOtherDevices, resolvePeerDevices } from './envelopes'
import { persistSnapshot } from './snapshot'

/**
 * Changing a message that already exists: editing it, deleting it, reacting to it.
 *
 * All three name the message by the id the *receiving* device knows it by, and
 * every device has its own id — which is why the sender keeps the mapping from
 * `sendMessage` (`MessageRecord.envelopeIdsByDevice`) and builds one payload per
 * device rather than broadcasting a single one.
 *
 * This device's own copy is not sent to itself: the caller applies the change
 * locally, and these envelopes are what everyone else needs to hear about.
 */

export type MessageAction =
  | { kind: 'edit'; newText: string }
  | { kind: 'delete' }
  | { kind: 'reaction'; emoji: string; remove: boolean }

export type MessageActionPayload = {
  kind: 'edit' | 'delete' | 'reaction'
  target_envelope_id: string
  new_plaintext_hex?: string
  emoji?: string
  remove?: boolean
}

/** @returns how many envelopes were sent. */
export async function sendMessageAction(
  account: Account,
  message: MessageRecord,
  action: MessageAction,
): Promise<number> {
  const envelopeType = envelopeTypeFor(action.kind)
  const detail = await getConversation(account, message.conversationId)
  const recipients = detail.members.filter((member) => member !== account.id)

  const envelopes: Envelope[] = []

  for (const recipientId of recipients) {
    for (const device of await resolvePeerDevices(account, recipientId)) {
      envelopes.push(
        await buildActionEnvelope(account, message, action, envelopeType, recipientId, device.deviceNumber),
      )
    }
  }

  // This account's other devices hold their own copy of the message, so they get
  // the same envelope type with their own target id.
  for (const device of await resolveOwnOtherDevices(account)) {
    envelopes.push(
      await buildActionEnvelope(account, message, action, envelopeType, account.id, device.deviceNumber),
    )
  }

  if (envelopes.length > 0) {
    await requireActiveClient().uploadEnvelopes(envelopes)
    await persistSnapshot(account.id)
  }

  return envelopes.length
}

function envelopeTypeFor(kind: MessageAction['kind']): number {
  switch (kind) {
    case 'edit':
      return ENVELOPE_TYPE_EDIT
    case 'delete':
      return ENVELOPE_TYPE_DELETE
    default:
      return ENVELOPE_TYPE_REACTION
  }
}

async function buildActionEnvelope(
  account: Account,
  message: MessageRecord,
  action: MessageAction,
  envelopeType: number,
  recipientAccountId: string,
  recipientDeviceNumber: number,
): Promise<Envelope> {
  const targetEnvelopeId = targetFor(message, recipientAccountId, recipientDeviceNumber)
  const payload = buildPayload(action, targetEnvelopeId)
  const encrypted = await encryptForDevice(
    account,
    recipientAccountId,
    recipientDeviceNumber,
    utf8ToHex(JSON.stringify(payload)),
  )

  return buildEnvelope({
    senderAccountId: account.id,
    senderDeviceNumber: account.deviceNumber,
    recipientAccountId,
    recipientDeviceNumber,
    envelopeType,
    isPrekeyMessage: encrypted.isPrekeyMessage,
    ciphertextHex: encrypted.ciphertextHex,
    conversationId: message.conversationId,
  })
}

/**
 * The message's id on that device.
 *
 * Falls back to our own id when the mapping is missing — an older message, or one
 * this device received rather than sent. The receiver then finds nothing to
 * change and ignores it, which is the least harmful outcome available.
 */
function targetFor(
  message: MessageRecord,
  recipientAccountId: string,
  recipientDeviceNumber: number,
): string {
  const key = `${recipientAccountId}:${recipientDeviceNumber}`
  const known = message.envelopeIdsByDevice?.[key]
  if (known === undefined) {
    console.warn(`[crypto] no envelope id recorded for ${key}; using the local one`)
  }
  return known ?? message.envelopeId
}

function buildPayload(action: MessageAction, targetEnvelopeId: string): MessageActionPayload {
  switch (action.kind) {
    case 'edit':
      return {
        kind: 'edit',
        target_envelope_id: targetEnvelopeId,
        new_plaintext_hex: utf8ToHex(action.newText),
      }
    case 'delete':
      return { kind: 'delete', target_envelope_id: targetEnvelopeId }
    default:
      return {
        kind: 'reaction',
        target_envelope_id: targetEnvelopeId,
        emoji: action.emoji,
        remove: action.remove,
      }
  }
}
