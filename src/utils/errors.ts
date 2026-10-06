/**
 * An unknown thrown value as something a panel can show.
 *
 * The server's own message is preferred everywhere it exists — "not found" and
 * "connection refused" are different problems, and only the server knows which
 * one it is. This exists so that the conversion is written once rather than
 * spelled out as `cause instanceof Error ? cause.message : String(cause)` in
 * every catch block.
 */
export function describeCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}
