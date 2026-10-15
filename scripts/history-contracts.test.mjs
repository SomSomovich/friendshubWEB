/** Run: node --import tsx scripts/history-contracts.test.mjs */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assembleHistoryChunk, clearHistoryFragments, historyChunks, parseHistoryChunk } from '../src/crypto/historyProtocol.ts'
import { receiveHistoryChunk } from '../src/crypto/historySync.ts'
import { useHistorySyncStore } from '../src/state/historySyncStore.ts'
const id = '019a1234-1234-7000-8000-000000000001'
const transfer = '019a1234-1234-7000-8000-000000000002'

test('large Unicode history items survive reversed fragment order and repeated fragments', () => {
  const value = { text: '😀Привет'.repeat(7000) }
  const chunks = historyChunks(transfer, id, 'message', 'logical', value)
  assert.ok(chunks.length > 1)
  let received
  for (const chunk of [...chunks].reverse()) {
    assert.ok(parseHistoryChunk(chunk))
    const partial = assembleHistoryChunk(id, 2, chunk)
    if (partial !== undefined) received = partial
    else assert.equal(assembleHistoryChunk(id, 2, chunk), undefined)
  }
  assert.deepEqual(received, value)
})

test('partial assemblies are isolated by source device and cleared on disconnect', () => {
  const chunks = historyChunks(transfer, id, 'message', 'another', { text: 'a'.repeat(30000) })
  assert.equal(assembleHistoryChunk(id, 2, chunks[0]), undefined)
  assert.equal(assembleHistoryChunk(id, 3, chunks[1]), undefined)
  clearHistoryFragments(id)
  assert.equal(assembleHistoryChunk(id, 2, chunks[1]), undefined)
  clearHistoryFragments(id)
})

test('invalid versions, oversized items and inconsistent fragment counts are rejected', () => {
  const chunk = historyChunks(transfer, id, 'complete', id, { message_count: 0 })[0]
  assert.equal(parseHistoryChunk({ ...chunk, version: 2 }), null)
  assert.equal(parseHistoryChunk({ ...chunk, part_index: -1 }), null)
  assert.equal(parseHistoryChunk({ ...chunk, part_count: 100000 }), null)
  assert.equal(parseHistoryChunk({ ...chunk, data: '%%%' }), null)
  assert.throws(() => historyChunks(transfer, id, 'message', 'huge', { text: 'a'.repeat(2 * 1024 * 1024) }), /2 MiB/)
})

test('historical authors cannot be imported by a peer or by the local device', async () => {
  const account = { id, deviceNumber: 3 }
  const chunk = historyChunks(transfer, id, 'complete', id, { message_count: 0 })[0]
  const envelope = { senderAccountId: transfer, recipientAccountId: id, senderDeviceNumber: 2, conversationId: id }
  await assert.rejects(receiveHistoryChunk(account, envelope, chunk), /another own device/)
  await assert.rejects(receiveHistoryChunk(account, { ...envelope, senderAccountId: id, senderDeviceNumber: 3 }, chunk), /another own device/)
})

test('history progress ignores unrelated sources and does not turn an import failure into success', () => {
  const store = useHistorySyncStore.getState()
  store.start(id, 2, [id])
  store.touch(id, 4, id, 100, true)
  assert.equal(useHistorySyncStore.getState().accounts[id].received, 0)
  store.fail(id, 'missing item')
  store.touch(id, 2, id, 1, true)
  assert.equal(useHistorySyncStore.getState().accounts[id].status, 'error')
  store.start(id, 2, [id])
  store.touch(id, 2, id, 1, true)
  assert.equal(useHistorySyncStore.getState().accounts[id].status, 'complete')
})
