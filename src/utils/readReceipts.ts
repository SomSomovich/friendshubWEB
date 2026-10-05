/**
 * Turning read markers into the one number a tick needs.
 *
 * A marker is per account and per conversation (API_FRONTEND.txt §12), and it is
 * the newest `server_timestamp` that account has read up to. A message counts as
 * read when *every* other participant's marker has reached it — in a group, one
 * person having read it is not the same as the group having read it.
 *
 * Pure, and separate from the store, because the whole rule is this function and
 * it is worth being able to check it directly.
 */

/** A message is read at or below this; zero means nothing is. */
export function readWatermark(
  markers: Record<string, number>,
  selfAccountId: string,
  /** How many others have to have read it — one for a direct chat. */
  expectedReaders: number,
): number {
  const others = Object.entries(markers).filter(([accountId]) => accountId !== selfAccountId)
  if (others.length < Math.max(1, expectedReaders)) {
    return 0
  }
  // The oldest marker is the one everybody has passed.
  return Math.min(...others.map(([, lastReadAt]) => lastReadAt))
}

/**
 * Whether one of this account's own messages has been read.
 *
 * A message whose server stamp is not known yet falls back to the local clock,
 * which can make this answer a moment late — never early, because a client whose
 * clock runs ahead produces a stamp that the peer's marker has not reached yet.
 * Late is the harmless direction for a tick.
 */
export function isMessageRead(
  serverTimestamp: number,
  watermark: number,
): boolean {
  return serverTimestamp > 0 && watermark >= serverTimestamp
}
