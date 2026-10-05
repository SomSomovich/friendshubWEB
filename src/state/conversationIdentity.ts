import { avatarImageUrl, conversationAvatarUrl } from '../api/avatars'
import { getConversation } from '../api/conversations'
import type { ConversationRecord } from '../storage/db'
import { rememberPeer } from '../storage/read_state'
import type { Account } from '../types'

/**
 * What a conversation is called and whose face it wears.
 *
 * Shared by the chat list and the conversation view because the two must agree:
 * a row that says "мама" opening a header that says "User_9876543" reads as a
 * bug. The server sends a title only for groups and channels, so a direct chat
 * has to be named after its peer — whom the conversation list does not mention
 * and the detail endpoint does.
 */

export type ContactName = {
  username: string
  localUsername: string | null
  avatarUrl: string | null
}

/** Translations the resolver cannot make itself. */
export type IdentityLabels = {
  saved: string
  unknown: string
}

export type ResolvedIdentity = {
  title: string
  avatarUrl: string | null
  /** The peer of a direct conversation; `null` for every other kind. */
  peerAccountId: string | null
}

export async function resolveConversationIdentity(
  account: Account,
  conversation: ConversationRecord,
  contacts: Map<string, ContactName>,
  knownPeers: Record<string, string>,
  labels: IdentityLabels,
): Promise<ResolvedIdentity> {
  if (conversation.kind === 'saved') {
    return { title: labels.saved, avatarUrl: null, peerAccountId: null }
  }

  if (conversation.kind === 'direct') {
    const peerAccountId = await resolvePeerAccountId(account, conversation, knownPeers)
    if (peerAccountId === null) {
      return { title: labels.unknown, avatarUrl: null, peerAccountId: null }
    }
    const contact = contacts.get(peerAccountId)
    return {
      // The name this account chose for the contact wins over the peer's own.
      title: contact?.localUsername ?? contact?.username ?? labels.unknown,
      // Not the contact's `avatarUrl`: the server sends that one as a path
      // relative to its own origin, which is not where the app is served from.
      avatarUrl: avatarImageUrl(peerAccountId),
      peerAccountId,
    }
  }

  return {
    title: conversation.title ?? labels.unknown,
    // A group or channel without a picture is the common case, and the list
    // endpoint says so — asking for one anyway would be a request per row whose
    // only possible answer is a 404.
    avatarUrl: conversation.avatarUrl ? conversationAvatarUrl(conversation.id) : null,
    peerAccountId: null,
  }
}

/**
 * Which account a direct conversation is with.
 *
 * The list endpoint does not say, so the detail is fetched once and remembered;
 * a failure returns `null` rather than throwing, because one unknown row must
 * not empty the whole list.
 */
export async function resolvePeerAccountId(
  account: Account,
  conversation: ConversationRecord,
  known: Record<string, string>,
): Promise<string | null> {
  const cached = known[conversation.id]
  if (cached !== undefined) {
    return cached
  }

  try {
    const detail = await getConversation(account, conversation.id)
    const peerAccountId = detail.members.find((member) => member !== account.id) ?? null
    if (peerAccountId !== null) {
      await rememberPeer(account.id, conversation.id, peerAccountId)
    }
    return peerAccountId
  } catch (error) {
    console.warn(`[state] could not resolve the peer of ${conversation.id}`, error)
    return null
  }
}
