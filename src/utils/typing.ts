import { nowSeconds } from './time'

/**
 * Who is typing, and until when.
 *
 * Pure and separate from the store because the expiry rule is the whole of it:
 * the protocol has no "stopped typing" frame, so an indicator is a timestamp in
 * the future that quietly stops being one. Nothing runs a timer to clear it —
 * a render is what notices.
 */

/** How long an indicator stays up after the last frame. */
export const TYPING_TTL_SECONDS = 5

export type TypingState = Record<string, Record<string, number>>

/** True while somebody's typing indicator has not expired. */
export function typingIsActive(untilSeconds: number, now: number = nowSeconds()): boolean {
  return untilSeconds > now
}

/**
 * The accounts typing in a conversation right now.
 *
 * Per account rather than per conversation: a group can have several people
 * typing at once, and the header says something different when it does.
 */
export function activeTypers(
  typing: TypingState,
  conversationId: string,
  now: number = nowSeconds(),
): string[] {
  const inConversation = typing[conversationId]
  if (inConversation === undefined) {
    return []
  }
  return Object.entries(inConversation)
    .filter(([, until]) => typingIsActive(until, now))
    .map(([accountId]) => accountId)
}

/** Records one account typing in one conversation, replacing their previous entry. */
export function withTyping(
  typing: TypingState,
  conversationId: string,
  accountId: string,
  until: number,
): TypingState {
  return {
    ...typing,
    [conversationId]: { ...typing[conversationId], [accountId]: until },
  }
}
