/** Run: node --import tsx scripts/channel-contracts.test.mjs */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { useChannelPostsStore, channelFeedKey } from '../src/state/channelPostsStore.ts'
import { runReceiveWork } from '../src/crypto/receiveQueue.ts'
const post = (id, text = id) => ({ id, channelId: 'channel', authorType: 'account', authorId: 'self', text, attachmentIds: [], forwardFrom: null, replyToPostId: null, createdAt: 1000, editedAt: null, pinnedAt: null, discussionCommentCount: 0 })

test('channel HTTP pages reconcile deletes while preserving a concurrent live arrival and edit', () => {
  const store = useChannelPostsStore.getState()
  store.merge('self', 'channel', [post('3'), post('2'), post('1')])
  const snapshot = useChannelPostsStore.getState().feeds[channelFeedKey('self', 'channel')]
  store.merge('self', 'channel', [post('4'), post('3', 'Live edit')], true)
  store.remove('self', 'channel', '2')
  store.reconcile('self', 'channel', [post('3', 'Stale'), post('2')], snapshot)
  const rows = useChannelPostsStore.getState().feeds[channelFeedKey('self', 'channel')]
  assert.deepEqual(rows.map((item) => item.id), ['4', '3'])
  assert.equal(rows[1].text, 'Live edit')
})

test('channel cache is account-scoped and a logout only clears that account', () => {
  const store = useChannelPostsStore.getState()
  store.merge('other', 'channel', [post('5')])
  store.clearAccount('self')
  assert.equal(useChannelPostsStore.getState().feeds[channelFeedKey('self', 'channel')], undefined)
  assert.equal(useChannelPostsStore.getState().feeds[channelFeedKey('other', 'channel')][0].id, '5')
})

test('live and HTTP crypto work is serialized per account and recovers after failure', async () => {
  const order = []
  let release
  const gate = new Promise((resolve) => { release = resolve })
  const first = runReceiveWork('self', async () => { order.push('first'); await gate; throw new Error('failed key') })
  const second = runReceiveWork('self', async () => { order.push('second'); return 2 })
  await runReceiveWork('other', async () => { order.push('other') })
  assert.deepEqual(order, ['first', 'other'])
  release()
  await assert.rejects(first, /failed key/)
  assert.equal(await second, 2)
  assert.deepEqual(order, ['first', 'other', 'second'])
})
