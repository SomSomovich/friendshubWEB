import { isUuid } from '../utils/uuid'
import { isRecord } from './payloads'

export const HISTORY_FRAGMENT_BYTES = 24 * 1024
export const HISTORY_MAX_ITEM_BYTES = 2 * 1024 * 1024
export type HistoryChunk = {
  kind: 'history_sync'; version: 1; transfer_id: string; conversation_id: string
  item_kind: 'message' | 'attachment' | 'complete'; item_id: string
  part_index: number; part_count: number; data: string
}
export function parseHistoryChunk(value: unknown): HistoryChunk | null {
  if (!isRecord(value) || value.kind !== 'history_sync' || value.version !== 1 ||
    typeof value.transfer_id !== 'string' || !isUuid(value.transfer_id) ||
    typeof value.conversation_id !== 'string' || !isUuid(value.conversation_id) ||
    !['message', 'attachment', 'complete'].includes(String(value.item_kind)) ||
    typeof value.item_id !== 'string' || value.item_id.length < 1 || value.item_id.length > 128 ||
    typeof value.part_index !== 'number' || !Number.isSafeInteger(value.part_index) ||
    typeof value.part_count !== 'number' || !Number.isSafeInteger(value.part_count) ||
    value.part_count < 1 || value.part_count > Math.ceil(HISTORY_MAX_ITEM_BYTES / HISTORY_FRAGMENT_BYTES) ||
    value.part_index < 0 || value.part_index >= value.part_count ||
    typeof value.data !== 'string' || value.data.length > HISTORY_FRAGMENT_BYTES * 4 / 3 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.data)
  ) return null
  return value as HistoryChunk
}
export function historyChunks(transferId: string, conversationId: string, itemKind: HistoryChunk['item_kind'], itemId: string, item: unknown): HistoryChunk[] {
  const bytes = new TextEncoder().encode(JSON.stringify(item))
  if (bytes.length > HISTORY_MAX_ITEM_BYTES) throw new Error('history item exceeds 2 MiB')
  const count = Math.max(1, Math.ceil(bytes.length / HISTORY_FRAGMENT_BYTES))
  return Array.from({ length: count }, (_, index) => ({
    kind: 'history_sync', version: 1, transfer_id: transferId, conversation_id: conversationId,
    item_kind: itemKind, item_id: itemId, part_index: index, part_count: count,
    data: btoa(String.fromCharCode(...bytes.subarray(index * HISTORY_FRAGMENT_BYTES, (index + 1) * HISTORY_FRAGMENT_BYTES))),
  }))
}

type Assembly = { count: number; parts: Map<number, Uint8Array>; size: number; updatedAt: number }
const assemblies = new Map<string, Assembly>()
export function clearHistoryFragments(accountId: string): void {
  for (const key of assemblies.keys()) if (key.startsWith(`${accountId}:`)) assemblies.delete(key)
}
/** Incomplete items stay in memory; completed records are durably imported before ACK. */
export function assembleHistoryChunk(accountId: string, sourceDevice: number, chunk: HistoryChunk): unknown | undefined {
  const now = Date.now()
  for (const [key, value] of assemblies) if (now - value.updatedAt > 10 * 60_000) assemblies.delete(key)
  const key = `${accountId}:${sourceDevice}:${chunk.transfer_id}:${chunk.conversation_id}:${chunk.item_kind}:${chunk.item_id}`
  const assembly = assemblies.get(key) ?? { count: chunk.part_count, parts: new Map(), size: 0, updatedAt: now }
  if (assembly.count !== chunk.part_count) throw new Error('inconsistent history fragment count')
  if (!assemblies.has(key) && assemblies.size >= 32) throw new Error('too many incomplete history items')
  if (!assembly.parts.has(chunk.part_index)) {
    const bytes = Uint8Array.from(atob(chunk.data), (character) => character.charCodeAt(0))
    assembly.parts.set(chunk.part_index, bytes)
    assembly.size += bytes.byteLength
  }
  if (assembly.size > HISTORY_MAX_ITEM_BYTES) { assemblies.delete(key); throw new Error('history item exceeds size limit') }
  assembly.updatedAt = now
  assemblies.set(key, assembly)
  if (assembly.parts.size !== assembly.count) return undefined
  const combined = new Uint8Array(assembly.size)
  let offset = 0
  for (let index = 0; index < assembly.count; index++) {
    const bytes = assembly.parts.get(index)
    if (!bytes) throw new Error('missing history fragment')
    combined.set(bytes, offset)
    offset += bytes.length
  }
  assemblies.delete(key)
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(combined))
}
