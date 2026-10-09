import { useMemo } from 'react'
import type { Account } from '../types'
import { useBotNames } from './useBotNames'
import type { ConversationMember } from './useConversationMembers'
import { useSenderNames } from './useSenderNames'

/**
 * Names for a member list, whatever each member happens to be.
 *
 * A group's members are all accounts; a channel's may be accounts or bots, and
 * the two are named from different endpoints. Both are resolved here and keyed
 * by `memberKey`, so a row can look up its label without knowing which it is.
 */

/**
 * Unknown members that may cost a profile read.
 *
 * Contacts are free — one request names all of them — so this ceiling only
 * bounds how many strangers a single screen will look up. A group of two
 * hundred would otherwise fire two hundred requests the moment it is opened.
 */
const MAX_MEMBER_LOOKUPS = 50

export function memberKey(member: Pick<ConversationMember, 'actorType' | 'id'>): string {
  return `${member.actorType}:${member.id}`
}

export function useMemberLabels(
  account: Account,
  members: ConversationMember[],
): Map<string, string> {
  const { accountIds, botIds } = useMemo(() => split(members), [members])
  const accountNames = useSenderNames(account, accountIds, MAX_MEMBER_LOOKUPS)
  const botNames = useBotNames(account, botIds)
  const selfId = account.id
  const selfName = account.username

  return useMemo(() => {
    const labels = new Map<string, string>()
    for (const id of accountIds) {
      const name = accountNames.get(id)
      if (name !== undefined) {
        labels.set(`account:${id}`, name)
      }
    }
    // The reader's own row is never looked up — `primeSenderNames` skips the
    // signed-in account, because a message from oneself is drawn as "you". A
    // member list has no such shorthand for the name, so it is filled in here
    // rather than shown as "unknown peer".
    labels.set(`account:${selfId}`, selfName)
    for (const id of botIds) {
      const handle = botNames.get(id)
      // A bot whose handle could not be read keeps its generic label; the row
      // still has to be shown, because it still has to be removable.
      if (typeof handle === 'string') {
        labels.set(`bot:${id}`, `@${handle}`)
      }
    }
    return labels
  }, [accountIds, botIds, accountNames, botNames, selfId, selfName])
}

function split(members: ConversationMember[]): { accountIds: string[]; botIds: string[] } {
  const accountIds = new Set<string>()
  const botIds = new Set<string>()
  for (const member of members) {
    if (member.actorType === 'account') {
      accountIds.add(member.id)
    } else {
      botIds.add(member.id)
    }
  }
  return { accountIds: [...accountIds], botIds: [...botIds] }
}
