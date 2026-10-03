/**
 * Time sources live here so the unit used by a given field is decided once.
 *
 * The server speaks Unix *seconds* everywhere, and that is what gets persisted
 * for wire timestamps. Local bookkeeping that needs finer resolution (cache
 * expiry) uses milliseconds.
 */

/** Unix seconds — for anything that mirrors a server timestamp. */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

/** Epoch milliseconds — for local TTLs, where whole seconds are too coarse. */
export function nowMillis(): number {
  return Date.now()
}
