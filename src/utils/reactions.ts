/**
 * The reaction strip offered on every message.
 *
 * A fixed set rather than a full emoji picker: a reaction is a quick answer, and
 * a picker belongs to a composer rather than to a menu opened with a long press.
 * The set matches the one the native client offers.
 */
export const REACTION_EMOJI = ['👍', '❤️', '😂', '😮', '😢', '🔥'] as const

/**
 * The emoji this account has already reacted with, if any.
 *
 * One actor has one reaction per message, so finding it needs no other key.
 */
export function ownReaction(
  reactions: readonly { actorId: string; emoji: string }[],
  accountId: string,
): string | null {
  return reactions.find((reaction) => reaction.actorId === accountId)?.emoji ?? null
}

export type ReactionCount = {
  emoji: string
  count: number
  /** True when this account is one of the reactors. */
  mine: boolean
}

/**
 * Groups a message's reactions for display.
 *
 * Ordered by first appearance so a chip does not jump around when somebody else
 * reacts, and keyed by emoji so two people choosing the same one share a chip.
 */
export function countReactions(
  reactions: readonly { actorId: string; emoji: string }[],
  accountId: string,
): ReactionCount[] {
  const counts: ReactionCount[] = []

  for (const reaction of reactions) {
    const existing = counts.find((entry) => entry.emoji === reaction.emoji)
    if (existing === undefined) {
      counts.push({ emoji: reaction.emoji, count: 1, mine: reaction.actorId === accountId })
      continue
    }
    existing.count += 1
    existing.mine ||= reaction.actorId === accountId
  }

  return counts
}
