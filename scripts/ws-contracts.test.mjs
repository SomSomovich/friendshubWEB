/** Run: node --import tsx scripts/ws-contracts.test.mjs */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fh } from '../src/ws/proto/friendshub.js'
import { dispatchFrame } from '../src/ws/dispatch.ts'
import { uuidToBytes } from '../src/ws/envelope.ts'
import { FrameSender } from '../src/ws/sender.ts'

const id = '019a1234-1234-7000-8000-000000000001'
function receiver() {
  const events = []
  return { events, handlers: new Proxy({}, { get: (_target, name) => (...args) => events.push({ name, args }) }) }
}
function sender() {
  const frames = []
  const socket = { readyState: 1, bufferedAmount: 0, send: (frame) => frames.push(new Uint8Array(frame.buffer, frame.byteOffset, frame.byteLength)) }
  return { frames, sender: new FrameSender(() => socket) }
}
function envelope(index, size) {
  return { envelopeId: `019a1234-1234-7000-8000-${String(index).padStart(12, '0')}`,
    senderAccountId: id, senderDeviceNumber: 1, recipientAccountId: id, recipientDeviceNumber: 3,
    envelopeType: 2, isPrekeyMessage: false, ciphertext: 'ab'.repeat(size), clientTimestamp: 100,
    conversationId: id, senderIsBot: false }
}

test('conversation updates preserve explicit false and empty metadata values', () => {
  const { events, handlers } = receiver()
  const frame = fh.ServerFrame.decode(fh.ServerFrame.encode({ conversationUpdated: {
    conversationId: uuidToBytes(id), title: 'Changed', description: '', isPublic: false, membersChanged: true,
  } }).finish())
  dispatchFrame(frame, handlers)
  assert.deepEqual(events[0], { name: 'onConversationUpdated', args: [{ conversationId: id, title: 'Changed', description: '', isPublic: false, membersChanged: true }] })
})

test('history relay decodes the source device and conversation UUIDs', () => {
  const { events, handlers } = receiver()
  dispatchFrame(fh.ServerFrame.decode(fh.ServerFrame.encode({ historyRequestRelay: {
    fromDeviceNumber: 3, conversationIds: [uuidToBytes(id)],
  } }).finish()), handlers)
  assert.deepEqual(events[0], { name: 'onHistoryRequest', args: [{ fromDeviceNumber: 3, conversationIds: [id] }] })
})

test('history requests use the documented protobuf field and enforce the 200-chat cap', () => {
  const { frames, sender: writer } = sender()
  writer.requestHistory(3, [id])
  const frame = fh.ClientFrame.decode(frames[0])
  assert.equal(frame.kind, 'historyRequest')
  assert.equal(frame.historyRequest.targetDeviceNumber, 3)
  assert.throws(() => writer.requestHistory(0, [id]), /invalid history request/)
  assert.throws(() => writer.requestHistory(3, Array(201).fill(id)), /invalid history request/)
})

test('large uploads split by encoded size before exceeding 256 KiB', async () => {
  const { frames, sender: writer } = sender()
  await writer.uploadEnvelopes(Array.from({ length: 4 }, (_, index) => envelope(index, 65536)))
  assert.equal(frames.length, 2)
  assert.ok(frames.every((frame) => frame.byteLength <= 256 * 1024))
  assert.deepEqual(frames.map((frame) => fh.ClientFrame.decode(frame).upload.envelopes.length), [3, 1])
})

test('small uploads still enforce the 128-envelope limit', async () => {
  const { frames, sender: writer } = sender()
  await writer.uploadEnvelopes(Array.from({ length: 130 }, (_, index) => envelope(index, 10)))
  assert.deepEqual(frames.map((frame) => fh.ClientFrame.decode(frame).upload.envelopes.length), [128, 2])
})

test('an oversized ciphertext is rejected without writing a frame', async () => {
  const { frames, sender: writer } = sender()
  await assert.rejects(writer.uploadEnvelopes([envelope(1, 65537)]), /64 KiB/)
  assert.equal(frames.length, 0)
})
