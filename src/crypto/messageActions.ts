import { getConversation } from '../api/conversations'
import type { MessageRecord } from '../storage/db'
import type { Account, Envelope } from '../types'
import { nowSeconds } from '../utils/time'
import { requireActiveClient } from '../ws/activeClient'
import {
  ENVELOPE_TYPE_DELETE,
  ENVELOPE_TYPE_EDIT,
  ENVELOPE_TYPE_REACTION,
} from '../ws/envelopeTypes'
import { resolvePeerDevices } from './envelopes'
import { encodePayload, type DeletePayload, type EditPayload, type ReactionPayload } from './payloads'
import { ownDeviceCopies, pairwise } from './send'
import { persistSnapshot } from './snapshot'

/**
 * Changing a message that already exists: editing it, deleting it, reacting to it.
 *
 * All three name the message by its *logical* id, and that id is the same on
 * every device — which is the whole point of the payload contract, and the
 * reason one payload can be encrypted for everyone here. Before it, each device
 * knew the message by its own envelope id and the sender had to build a
 * different payload per device and keep a map to know which.
 *
 * This device's own copy is not sent to itself: the caller applies the change
 * locally, and these envelopes are what everyone else needs to hear about.
 */

export type MessageAction =
  | { kind: 'edit'; newText: string }
  | { kind: 'delete' }
  | { kind: 'reaction'; emoji: string | null }

/** @returns how many envelopes were sent. */
export async function sendMessageAction(
  account: Account,
  message: MessageRecord,
  action: MessageAction,
): Promise<number> {
  const payloadHex = encodePayload(buildPayload(message.messageId, action))
  const envelopeType = envelopeTypeFor(action.kind)
  const detail = await getConversation(account, message.conversationId)
  const recipients = detail.members.filter((member) => member !== account.id)

  const envelopes: Envelope[] = []
  for (const recipientId of recipients) {
    // Sequential: each pairwise call may establish a session, and the module's
    // state is not safe to mutate from two of them at once.
    for (const device of await resolvePeerDevices(account, recipientId)) {
      envelopes.push(
        await pairwise(
          account,
          recipientId,
          device.deviceNumber,
          payloadHex,
          envelopeType,
          message.conversationId,
        ),
      )
    }
  }

  envelopes.push(
    ...(await ownDeviceCopies(account, payloadHex, envelopeType, message.conversationId)),
  )

  if (envelopes.length > 0) {
    await requireActiveClient().uploadEnvelopes(envelopes)
  }
  await persistSnapshot(account.id)

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

function buildPayload(
  targetMessageId: string,
  action: MessageAction,
): EditPayload | DeletePayload | ReactionPayload {
  const at = nowSeconds()

  switch (action.kind) {
    case 'edit':
      return { kind: 'edit', target_message_id: targetMessageId, new_text: action.newText, edited_at: at }
    case 'delete':
      return { kind: 'delete', target_message_id: targetMessageId, deleted_at: at }
    default:
      // A null emoji *is* the removal — there is no separate "unreact" envelope.
      return {
        kind: 'reaction',
        target_message_id: targetMessageId,
        emoji: action.emoji,
        created_at: at,
      }
  }
}
