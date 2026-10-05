import { getConversation } from '../api/conversations'
import type { Account, Envelope } from '../types'
import { utf8ToHex } from '../utils/hex'
import { createSenderKeyDistribution } from '../wasm'
import { requireActiveClient } from '../ws/activeClient'
import { ENVELOPE_TYPE_SENDER_KEY } from '../ws/envelopeTypes'
import { buildEnvelope, encryptForDevice, resolvePeerDevices } from './envelopes'
import { persistSnapshot } from './snapshot'

/**
 * Group crypto bookkeeping: who is in a conversation, and making sure they hold
 * this device's sender key.
 *
 * Separate from `send.ts` because it has nothing to do with the payload contract
 * — a sender key is opaque key material, not a message — and because the group
 * creation flow needs it without needing anything else in there.
 */

/** Group members other than this account. */
export async function resolveGroupMemberAccounts(
  account: Account,
  conversationId: string,
): Promise<string[]> {
  const detail = await getConversation(account, conversationId)
  return detail.members.filter((member) => member !== account.id)
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

/**
 * Sends the distribution to every device of every member.
 *
 * Pairwise, not group-encrypted: this is the key the group ciphertext is opened
 * with, so it cannot itself depend on one. The distribution is hex text rather
 * than the JSON payload contract — it is key material, and wrapping it in a
 * message shape would suggest it belongs to a message.
 */
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
    await persistSnapshot(account.id)
  }
}
