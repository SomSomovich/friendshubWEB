/** Real UI + IndexedDB, mocked server with more than a page in one second. */
import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BotChatScreen } from '../src/screens/BotChatScreen'
import { ConversationSettingsScreen } from '../src/screens/conversation/ConversationSettingsScreen'
import { ChannelPostModal } from '../src/components/conversation/ChannelPostModal'
import { SecurityEventsPanel } from '../src/components/settings/SecurityEventsPanel'
import { DeviceHistoryPanel } from '../src/components/settings/DeviceHistoryPanel'
import { JoinInviteScreen } from '../src/screens/JoinInviteScreen'
import { getAccountStore } from '../src/state/accountRegistry'
import { useUiStore } from '../src/state/uiStore'
import { saveConversations } from '../src/storage/conversations'
import { getMessages, saveMessage, saveMessages } from '../src/storage/messages'
import { rememberPeer } from '../src/storage/read_state'
import type { MessageRecord } from '../src/storage/db'
import type { Account, Conversation } from '../src/types'
import type { ChannelPost } from '../src/api/channel_posts'
import '../src/index.css'

const uuid = (n: number) => `019a1234-1234-7000-8000-${String(n).padStart(12, '0')}`
const account: Account = { id: uuid(1), deviceNumber: 3, userId: 1, fhNumber: 'FH0000001', username: 'Test', avatarUrl: null, totpEnabled: false, sessionToken: 'local-cursor-test', expiresAt: 9999999999 }
const peerId = uuid(2), channelId = uuid(3), savedId = uuid(4), directId = uuid(5), botId = uuid(6), postId = uuid(7)
const conversation = (id: string, kind: Conversation['kind']): Conversation => ({ id, kind, title: kind === 'direct' ? null : kind, avatarUrl: null, memberCount: 2, lastEnvelopeAt: 1000, createdAt: 1000, updatedAt: 1000, archivedAt: null, mutedUntil: null })
const conversations = [conversation(channelId, 'channel'), conversation(savedId, 'saved'), conversation(directId, 'direct')]
const post: ChannelPost = { id: postId, channelId, authorType: 'account', authorId: peerId, text: 'Cursor test', attachmentIds: [], forwardFrom: null, replyToPostId: null, createdAt: 1000, editedAt: null, pinnedAt: null, discussionCommentCount: 0 }
const bots = Array.from({ length: 501 }, (_, index) => ({ id: uuid(2000 + index), bot_id: botId, sender_account_id: account.id, direction: 'from_bot', text: `Bot ${index}`, reply_to_id: null, created_at: 1000 })).reverse()
const reactions = Array.from({ length: 501 }, (_, index) => ({ actor_type: 'bot', actor_id: uuid(3000 + index), emoji: '👍', created_at: 1000 })).reverse()
const envelope = (n: number, type = 1) => ({ envelope_id: uuid(n), sender_account_id: peerId, sender_device_number: 2, recipient_device_number: 3, envelope_type: type, is_prekey_message: false, ciphertext: '', client_timestamp: 1000, server_timestamp: 1000 })
const direct = Array.from({ length: 501 }, (_, index) => ({ ...envelope(4000 + index), conversation_id: directId })).reverse()
const saved = [...Array.from({ length: 201 }, (_, index) => envelope(6000 + index, 4)).reverse(), envelope(5999)]
const events = ['registered', 'login_ok', 'login_fail', 'totp_enabled', 'totp_disabled', 'device_registered', 'device_revoked', 'sessions_revoked', 'account_deletion_initiated', 'group_owner_transferred', 'channel_owner_transferred', 'group_deleted', 'channel_deleted']
const requests: { path: string; query: URLSearchParams; method: string }[] = []
let role = 'admin', failNextReactionPage = true, failNextSavedPage = true, joins = 0
let releaseReactionPage: (() => void) | undefined
let holdReactionPage = false
const originalFetch = globalThis.fetch.bind(globalThis)
function page<T>(rows: T[], url: URL, time: (row: T) => number, id: (row: T) => string, reaction = false): T[] {
  const timestamp = url.searchParams.get(reaction ? 'before_created_at' : 'before')
  const boundary = url.searchParams.get(reaction ? 'before_actor_id' : 'before_id')
  if (timestamp !== null && boundary === null) throw new Error(`Incomplete cursor: ${url.pathname}${url.search}`)
  const eligible = timestamp === null ? rows : rows.filter((row) => time(row) < Number(timestamp) || (time(row) === Number(timestamp) && id(row) < boundary!))
  return eligible.slice(0, Number(url.searchParams.get('limit') ?? 100))
}
globalThis.fetch = async (input, options) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href)
  if (url.pathname === '/result') return originalFetch(input, options)
  const path = url.pathname.replace(/^\/api\/v1/, '')
  requests.push({ path, query: url.searchParams, method: options?.method ?? 'GET' })
  let value: unknown
  if (path === `/bots/${botId}/info`) value = { bot_id: botId, owner_account_id: account.id, handle: 'testbot', created_at: 1000 }
  else if (path === `/bots/${botId}/messages`) value = page(bots, url, (row) => row.created_at, (row) => row.id)
  else if (path === `/channel-posts/${postId}/reactions`) {
    if (url.searchParams.has('before_actor_id') && failNextReactionPage) { failNextReactionPage = false; return new Response(JSON.stringify({ error: 'temporary_failure' }), { status: 500 }) }
    if (holdReactionPage && url.searchParams.has('before_actor_id')) await new Promise<void>((resolve) => { releaseReactionPage = resolve })
    value = page(reactions, url, (row) => row.created_at, (row) => row.actor_id, true)
  }
  else if (path === `/channel-posts/${postId}`) value = post
  else if (path === `/conversations/${directId}/envelopes`) value = page(direct, url, (row) => row.server_timestamp, (row) => row.envelope_id)
  else if (path === '/saved') value = { conversation_id: savedId, kind: 'saved', created_at: 1000 }
  else if (path === '/saved/messages') {
    if (url.searchParams.has('before_id') && failNextSavedPage) { failNextSavedPage = false; return new Response(JSON.stringify({ error: 'temporary_failure' }), { status: 500 }) }
    value = { envelopes: page(saved, url, (row) => row.server_timestamp, (row) => row.envelope_id) }
  }
  else if (path === '/conversations') value = conversations
  else if (path === '/contacts') value = [{ target_account_id: peerId, user_id: 2, fh_number: 'FH0000002', username: 'Peer', local_username: 'Друг', avatar_url: null }]
  else if (path === `/channels/${channelId}`) value = { conversation_id: channelId, title: 'Channel', description: null, owner_account_id: peerId, is_public: true, linked_group_conversation_id: null, handle: null, member_count: 2, created_at: 1000, updated_at: 1000 }
  else if (path === `/channels/${channelId}/members`) value = [{ actor_type: 'account', actor_id: account.id, role, joined_at: 1000 }, { actor_type: 'account', actor_id: peerId, role: 'owner', joined_at: 1000 }]
  else if (path === `/channels/${channelId}/analytics`) value = { posts: [{ post_id: postId, views: 42 }] }
  else if (path === `/channels/${channelId}/posts`) value = [post]
  else if (path === `/conversations/${channelId}/invites`) value = []
  else if (path.startsWith('/invites/join/')) { joins++; value = { conversation_id: channelId } }
  else if (path === '/security/events') value = events.map((event_type, index) => ({ id: uuid(8000 + index), event_type, ip_address: null, user_agent: null, created_at: 1000, metadata: event_type === 'device_revoked' ? 'device_number=3' : event_type === 'sessions_revoked' ? 'count=5' : event_type.endsWith('_transferred') ? peerId : event_type.endsWith('_deleted') ? channelId : null }))
  else throw new Error(`Unexpected cursor-test request: ${path}`)
  return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })
}
const host = document.createElement('div')
host.style.width = '375px'; document.body.append(host)
const root = createRoot(host)
let revision = 0
const checks: string[] = []
function check(value: unknown, name: string): asserts value { if (!value) throw new Error(name); checks.push(name) }
async function waitFor(condition: () => boolean, name: string) {
  const deadline = Date.now() + 7000
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`Timed out: ${name}; ${document.body.innerText.slice(-1500)}`)
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}
function show(element: ReactNode, initial = '/test', pattern = '*') {
  root.render(<StrictMode><MemoryRouter key={revision++} initialEntries={[initial]}><Routes><Route path={pattern} element={element} /><Route path="/app/chat/:id" element={<p>Joined</p>} /></Routes></MemoryRouter></StrictMode>)
}
function button(text: string) {
  const found = [...document.querySelectorAll<HTMLButtonElement>('button')].find((node) => node.textContent?.trim() === text)
  if (!found) throw new Error(`Missing button: ${text}`)
  return found
}
function record(row: ReturnType<typeof envelope>, conversationId: string): MessageRecord {
  return { accountId: account.id, conversationId, messageId: row.envelope_id, envelopeId: row.envelope_id,
    senderAccountId: peerId, senderDeviceNumber: 2, recipientAccountId: account.id, recipientDeviceNumber: 3,
    envelopeType: 1, plaintext: row.envelope_id, decryptedAt: 1000, clientTimestamp: 1000, serverTimestamp: 1000,
    attachments: [], replyTo: null, forwardFrom: null, editedAt: null, isPinned: false, reactions: [], status: 'sent' }
}
async function run() {
  const store = getAccountStore(account)
  store.setState({ conversations: conversations.map((row) => ({ ...row, accountId: account.id })) })
  await saveConversations(store.getState().conversations)
  await rememberPeer(account.id, directId, peerId)
  await saveMessages(direct.map((row) => record(row, directId)))
  useUiStore.getState().setTheme('dark'); useUiStore.getState().setLanguage('ru'); useUiStore.getState().setActiveAccount(account.id)
  show(<BotChatScreen />, `/app/bot/${botId}`, '/app/bot/:id')
  await waitFor(() => host.querySelectorAll('ol > li').length >= 200, 'first bot page')
  button('Загрузить более ранние сообщения').click()
  await waitFor(() => store.getState().botThreads[botId]?.length === 400, 'second bot page')
  button('Загрузить более ранние сообщения').click()
  await waitFor(() => store.getState().botThreads[botId]?.length === 501, 'third bot page')
  check(new Set(store.getState().botThreads[botId]?.map((row) => row.id)).size === 501, 'bot UI loads all 501 same-second messages without duplicates')
  check(requests.filter((row) => row.path === `/bots/${botId}/messages`).slice(-2).every((row) => row.query.get('before') === '1000' && row.query.has('before_id')), 'bot continuation uses exact timestamp and ID without a time offset')

  show(<ChannelPostModal account={account} post={post} onClose={() => {}} />)
  await waitFor(() => document.querySelectorAll('[role="dialog"] li').length === 200, 'first reaction page')
  button('Загрузить ещё реакции').click()
  await waitFor(() => !!document.querySelector('[role="dialog"] [role="alert"]'), 'reaction failure')
  check(document.querySelectorAll('[role="dialog"] li').length === 200, 'reaction page failure keeps already loaded rows')
  button('Повторить').click()
  await waitFor(() => document.querySelectorAll('[role="dialog"] li').length === 400, 'retry reaction page')
  button('Загрузить ещё реакции').click()
  await waitFor(() => document.querySelectorAll('[role="dialog"] li').length === 501, 'third reaction page')
  check(![...document.querySelectorAll('button')].some((node) => node.textContent === 'Загрузить ещё реакции'), 'reaction UI reaches all 501 actors and stops at a short page')
  const reactionRequests = requests.filter((row) => row.path.endsWith('/reactions') && row.query.has('before_actor_id'))
  check(reactionRequests[0]?.query.toString() === reactionRequests[1]?.query.toString(), 'retry preserves the entire reaction cursor')
  holdReactionPage = true
  show(<ChannelPostModal account={account} post={post} onClose={() => {}} />)
  await waitFor(() => document.querySelectorAll('[role="dialog"] li').length === 200, 'remounted reactions')
  button('Загрузить ещё реакции').click()
  await waitFor(() => releaseReactionPage !== undefined, 'held reaction page')
  show(<p>Closed</p>); await waitFor(() => !document.querySelector('[role="dialog"]'), 'closed modal')
  releaseReactionPage!(); holdReactionPage = false
  check(true, 'a pending reaction page can finish after the modal closes')

  show(<DeviceHistoryPanel account={account} />)
  await waitFor(() => !!host.querySelector(`option[value="${directId}"]`), 'device history selector')
  const select = host.querySelector('select')!
  select.value = directId; select.dispatchEvent(new Event('change', { bubbles: true }))
  await waitFor(() => !button('Загрузить доступное').disabled, 'device selection')
  button('Загрузить доступное').click()
  await waitFor(() => host.innerText.includes('уже есть 200'), 'first device page')
  button('Загрузить более раннее').click()
  await waitFor(() => button('Загрузить доступное').getAttribute('aria-busy') === 'true', 'second device page is processing')
  await waitFor(() => requests.filter((row) => row.path.endsWith('/envelopes')).length === 2 && !button('Загрузить более раннее').disabled, 'second device page')
  button('Загрузить более раннее').click()
  await waitFor(() => host.innerText.includes('уже есть 101'), 'third device page')
  check(requests.filter((row) => row.path.endsWith('/envelopes')).slice(1).every((row) => row.query.get('before') === '1000' && row.query.has('before_id')), 'device history continues across 501 same-second envelopes with the full cursor')
  check(![...host.querySelectorAll('button')].some((node) => node.textContent === 'Загрузить более раннее'), 'device history stops after the last page')
  let local = await getMessages(account.id, directId, { limit: 200 })
  const localIds = new Set(local.map((row) => row.envelopeId))
  while (local.length === 200) {
    const last = local.at(-1)!
    local = await getMessages(account.id, directId, { before: { timestamp: last.clientTimestamp, envelopeId: last.envelopeId }, limit: 200 })
    for (const row of local) localIds.add(row.envelopeId)
  }
  check(localIds.size === 501, 'local cached history also pages all rows sharing a second')
  await store.getState().actions.openConversation(directId)
  for (let count = 0; count < 12 && store.getState().hasOlder; count++) await store.getState().actions.loadOlderMessages()
  check(store.getState().messages.length === 501 && !store.getState().hasOlder && store.getState().messages.at(-1)?.envelopeId === direct.at(-1)?.envelope_id,
    'merged transcript preserves the ID tie-breaker so repeated local page loads reach all 501 messages')
  store.getState().actions.closeConversation(directId)

  show(<p>Saved history</p>)
  await store.getState().actions.openConversation(savedId)
  check(store.getState().messages.length === 0 && store.getState().hasOlder, 'control-only saved page keeps a usable continuation without a message row')
  await saveMessage(record(saved.at(-1)!, savedId))
  const savedCursor = store.getState().savedHistory[savedId]?.cursor
  await store.getState().actions.loadOlderMessages()
  check(store.getState().historyError !== null && store.getState().savedHistory[savedId]?.cursor === savedCursor, 'failed saved page retains its cursor and exposes a retryable history error')
  await store.getState().actions.loadOlderMessages()
  check(store.getState().messages.length === 0 && store.getState().hasOlder, 'second control-only saved page advances independently of decrypted messages')
  await store.getState().actions.loadOlderMessages()
  check(store.getState().messages.length === 1 && !store.getState().hasOlder, 'saved history reaches a cached message after 201 same-second control envelopes')
  check(requests.filter((row) => row.path === '/saved/messages').slice(1).every((row) => row.query.get('before') === '1000' && row.query.has('before_id')), 'saved requests use the last raw envelope timestamp and ID')
  store.getState().actions.dropConversationMessages(savedId)
  check(store.getState().savedHistory[savedId]?.cursor === null && store.getState().hasOlder, 'clearing saved history resets the in-memory boundary before using its local cutoff')
  store.getState().actions.closeConversation(savedId)

  show(<ConversationSettingsScreen />, `/app/chat/${channelId}/settings`, '/app/chat/:id/settings')
  await waitFor(() => host.innerText.includes('42') && host.innerText.includes('Просмотры публикаций'), 'admin analytics')
  check(!host.innerText.includes('Владение и удаление'), 'channel admin sees analytics without owner-only deletion and transfer controls')
  role = 'subscriber'
  show(<ConversationSettingsScreen />, `/app/chat/${channelId}/settings`, '/app/chat/:id/settings')
  await waitFor(() => host.innerText.includes('Настройки доступны'), 'subscriber settings denied')
  check(!host.innerText.includes('Просмотры публикаций'), 'channel subscriber cannot see analytics')
  show(<SecurityEventsPanel account={account} />)
  await waitFor(() => host.querySelectorAll('li').length === 13, 'all security event types')
  check(host.innerText.includes('2FA включена') && host.innerText.includes('Канал удалён') && host.innerText.includes('Номер устройства: 3') && host.innerText.includes('Завершено сессий: 5'), 'new security events and their device/session context are readable')
  show(<JoinInviteScreen />, '/join/channel-token', '/join/:token')
  await waitFor(() => host.innerText.includes('Joined'), 'channel invite join')
  check(joins === 1, 'StrictMode channel invitation mounts share one POST')
  show(<JoinInviteScreen />, '/join/channel-token', '/join/:token')
  await waitFor(() => joins === 2 && host.innerText.includes('Joined'), 'idempotent channel invite reopen')
  check(joins === 2, 'reopening a channel invitation accepts the existing-membership 200 response')
  root.unmount()
  return checks
}
void run().then((passed) => originalFetch('/result', { method: 'POST', body: JSON.stringify({ ok: true, checks: passed }) }))
  .catch((error: unknown) => originalFetch('/result', { method: 'POST', body: JSON.stringify({ ok: false, error: error instanceof Error ? `${error.message}\n${error.stack}` : String(error), checks }) }))
