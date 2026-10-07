/**
 * `0:07` — the shape a recorder and a voice note both show.
 *
 * Minutes and seconds, never hours: a voice message is measured in seconds and
 * nothing that long is worth drawing differently, while the call timer's
 * `H:MM:SS` is a different shape for a different place. The two count the same
 * way the rest of the app does — from the value in seconds, floored — so a clip
 * recorded as `0:07` plays back as `0:07` rather than `0:06`.
 */
export function formatClipDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)
  return `${minutes}:${String(total % 60).padStart(2, '0')}`
}
