/**
 * A logged-in account as the app tracks it. Up to five of these can be active
 * in one tab, each with its own crypto state and (for the active one) its own
 * WebSocket, which is why everything per-account is keyed by `id`.
 */
export type Account = {
  /** Account UUID from `POST /register` — also the WASM `account_id`. */
  id: string
  userId: number
  fhNumber: string
  username: string
  avatarUrl: string | null
  totpEnabled: boolean
  /** The device this tab registered as; must match the session. */
  deviceNumber: number
  /**
   * Secret. Lives in IndexedDB only — never in `localStorage`, never in a
   * snapshot blob, never in a log line.
   */
  sessionToken: string
  /** Unix seconds; the session is re-established when it passes. */
  expiresAt: number
}
