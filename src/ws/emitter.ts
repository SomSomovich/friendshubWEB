/**
 * A minimal typed event emitter. No dependency is worth pulling in for this,
 * and the alternative — an untyped callback map — would push `unknown` casts
 * into every handler in the crypto and state layers.
 */
export class TypedEmitter<Events extends Record<string, unknown>> {
  private readonly groups = new Map<string, Set<(payload: unknown) => void>>()

  /** Subscribes to an event; the returned function unsubscribes. */
  on<K extends keyof Events & string>(
    event: K,
    listener: (payload: Events[K]) => void,
  ): () => void {
    let group = this.groups.get(event)
    if (!group) {
      group = new Set()
      this.groups.set(event, group)
    }
    // One cast per subscription: the map is heterogeneous by construction, and
    // `emit` only ever looks a listener up under the key it was stored with.
    const stored = listener as (payload: unknown) => void
    group.add(stored)
    return () => {
      group.delete(stored)
    }
  }

  /** @returns how many listeners were called. */
  protected emit<K extends keyof Events & string>(event: K, payload: Events[K]): number {
    const group = this.groups.get(event)
    if (!group) {
      return 0
    }
    for (const listener of group) {
      try {
        listener(payload)
      } catch (error) {
        // One broken handler must not stop the others from being notified.
        console.error(`[ws] listener for "${event}" threw`, error)
      }
    }
    return group.size
  }
}
