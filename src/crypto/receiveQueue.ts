/** Shared by live delivery and explicit HTTP replay: ratchets mutate account state. */
const queues = new Map<string, Promise<unknown>>()
export function runReceiveWork<T>(accountId: string, work: () => Promise<T>): Promise<T> {
  const result = (queues.get(accountId) ?? Promise.resolve()).then(work)
  const tail = result.catch(() => {})
  queues.set(accountId, tail)
  void tail.then(() => { if (queues.get(accountId) === tail) queues.delete(accountId) })
  return result
}
