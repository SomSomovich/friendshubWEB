/**
 * Overlap the boundary second until the API gains its compound cursor.
 * Deduplicate returned items by ID. If a full second fills the entire page,
 * advance strictly so the UI can progress; only the server fix can recover its
 * omitted items. All documented timestamp cursors are exclusive integer seconds.
 */
export function nextHistoryBefore(timestamps: number[], previousBefore?: number): number | undefined {
  if (timestamps.length === 0) return undefined
  const oldest = Math.min(...timestamps)
  return previousBefore !== undefined && oldest + 1 >= previousBefore ? oldest : oldest + 1
}
