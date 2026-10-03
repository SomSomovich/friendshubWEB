/**
 * lib.dom types a binary payload as `ArrayBufferView<ArrayBuffer>`, while a
 * plain `Uint8Array` is `Uint8Array<ArrayBufferLike>` — the two do not line up
 * even though every view passed here is an ordinary `Uint8Array` and every
 * runtime accepts it unchanged. This is the single place that bridges the gap,
 * so the cast is not scattered across the HTTP and WebSocket layers.
 */
export function asBinaryPayload(bytes: Uint8Array): ArrayBufferView<ArrayBuffer> {
  return bytes as unknown as ArrayBufferView<ArrayBuffer>
}
