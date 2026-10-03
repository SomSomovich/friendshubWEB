import { loadSnapshot, saveSnapshot } from '../storage/crypto_state'
import { restore, snapshot } from '../wasm'

/**
 * Persistence of the module's in-memory state.
 *
 * WASM_API.txt §3 asks for a snapshot after every encrypt/decrypt: the state is
 * the only copy of sessions, sender keys and prekeys, and a crash without a
 * snapshot loses them. The write itself is serialised per account by the storage
 * layer's Web Lock.
 *
 * The two steps are not atomic with respect to each other (the module call is
 * synchronous, the write is not), and they cannot be: Web Locks are not
 * reentrant, so holding the lock across both would deadlock against itself.
 * Two tabs of one account cannot merge their module states anyway — a documented
 * limitation of the module (WASM_API.txt §7), not something this layer can fix.
 */

export async function persistSnapshot(accountId: string): Promise<void> {
  const json = await snapshot(accountId)
  await saveSnapshot(accountId, json)
}

/** Restores state written by `persistSnapshot`. `false` means "nothing stored". */
export async function restoreSnapshot(accountId: string): Promise<boolean> {
  const json = await loadSnapshot(accountId)
  if (json === null) {
    return false
  }
  await restore(accountId, json)
  return true
}
