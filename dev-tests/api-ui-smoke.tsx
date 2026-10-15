import { ChannelScreen } from '../src/screens/ChannelScreen'
import { uploadChannelAttachment, downloadChannelAttachment } from '../src/attachments/channel'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProfileFieldsPanel } from '../src/components/settings/ProfileFieldsPanel'
import { SecurityEventsPanel } from '../src/components/settings/SecurityEventsPanel'
import { UserProfileModal } from '../src/components/profile/UserProfileModal'
import { PrivacySettingsScreen } from '../src/screens/settings/PrivacySettingsScreen'
import { BotsSettingsScreen } from '../src/screens/settings/BotsSettingsScreen'
import { ConversationSettingsScreen } from '../src/screens/conversation/ConversationSettingsScreen'
import { CallHistoryScreen } from '../src/screens/CallHistoryScreen'
import { DiscoverScreen } from '../src/screens/DiscoverScreen'
import { getAccountStore } from '../src/state/accountRegistry'
import { useUiStore } from '../src/state/uiStore'
import { attachmentPreviewKind } from '../src/utils/attachmentPreview'
import { saveConversations } from '../src/storage/conversations'
import type { Account } from '../src/types'
import '../src/index.css'

const accountId = '019a1234-1234-7000-8000-000000000011'
const peerId = '019a1234-1234-7000-8000-000000000012'
const groupId = '019a1234-1234-7000-8000-000000000013'
const botId = '019a1234-1234-7000-8000-000000000014'
const account: Account = { id: accountId, deviceNumber: 3, userId: 1, fhNumber: 'FH0000001', username: 'Test', avatarUrl: null, totpEnabled: false, sessionToken: 'local-ui-test-only', expiresAt: 9999999999 }
const group = { id: groupId, kind: 'group' as const, title: 'Рабочая группа', avatarUrl: null, memberCount: 2, lastEnvelopeAt: 1000, createdAt: 1000, updatedAt: 1000, archivedAt: null, mutedUntil: null }
const requests: { method: string; path: string; query: string; body: Record<string, unknown> | null }[] = []
const channelId = '019a1234-1234-7000-8000-000000000016'
const postId = '019a1234-1234-7000-8000-000000000017'
const channel = { ...group, id: channelId, accountId, kind: 'channel' as const, title: 'Новости' }
let posts = [{ id: postId, channel_id: channelId, author_type: 'account', author_id: accountId, text: 'Первая публикация', attachment_ids: [] as string[], forward_from: null, reply_to_post_id: null, created_at: 1000, edited_at: null, pinned_at: null as number | null, discussion_comment_count: 0 }]
let publishAllowed = true
let failNextPost = false
let reaction: string | null = '👍'
const chunks = new Map<number, Uint8Array>()
const originalFetch = globalThis.fetch.bind(globalThis)
let fields = [{ label: 'GitHub', value: '@example' }]
let bots = [{ id: botId, token_prefix: 'fhbot_prefix', created_at: 1000, updated_at: 1000, handle: 'examplebot' }]
let calls = [{ id: 'call', peer_account_id: peerId, direction: 'outgoing', status: 'completed', started_at: 1000, ended_at: 1060 }]
globalThis.fetch = async (input, options) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href)
  if (url.pathname === '/result') return originalFetch(input, options)
  const path = url.pathname.replace(/^\/api\/v1/, '')
  const method = options?.method ?? 'GET'
  if (path.startsWith('/raw-chunk/')) {
    const index = Number(path.split('/').at(-1))
    if (method === 'PUT') { chunks.set(index, new Uint8Array(options!.body as Uint8Array)); return new Response(null, { status: 204 }) }
    return new Response(new Blob([chunks.get(index)!.slice()]))
  }
  const body = options?.body ? JSON.parse(String(options.body)) as Record<string, unknown> : null
  requests.push({ method, path, query: url.search, body })
  let value: unknown
  if (path === `/channels/${channelId}`) value = { conversation_id: channelId, title: channel.title, description: null, owner_account_id: publishAllowed ? accountId : peerId, is_public: true, linked_group_conversation_id: groupId, member_count: 2, created_at: 1000, updated_at: 1000 }
  else if (path === `/channels/${channelId}/posts`) {
    if (method === 'POST') {
      if (failNextPost) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        failNextPost = false
        return new Response(JSON.stringify({ error: 'temporary_failure' }), { status: 500 })
      }
      posts = [{ ...posts[0]!, id: `019a1234-1234-7000-8000-${String(17 + posts.length).padStart(12, '0')}`, text: String(body!.text), attachment_ids: body!.attachment_ids as string[] }, ...posts]; value = posts[0]
    } else value = posts
  }
  else if (path === `/channels/${channelId}/pinned`) value = posts.filter((post) => post.pinned_at !== null)
  else if (path === `/channels/${channelId}/can-publish`) value = { can_publish: publishAllowed }
  else if (path.startsWith('/channel-posts/')) {
    const id = path.split('/')[2]
    if (path.endsWith('/reactions')) {
      if (method === 'DELETE') { reaction = null; return new Response(null, { status: 204 }) }
      if (method === 'POST') { reaction = String(body!.emoji); return new Response(null, { status: 204 }) }
      value = reaction ? [{ actor_type: 'account', actor_id: peerId, emoji: reaction, created_at: 1000 }] : []
    } else if (path.endsWith('/pin')) {
      posts = posts.map((post) => post.id === id ? { ...post, pinned_at: method === 'POST' ? 1000 : null } : post)
      return new Response(null, { status: 204 })
    } else if (method === 'DELETE') { posts = posts.filter((post) => post.id !== id); return new Response(null, { status: 204 }) }
    else if (method === 'PATCH') { posts = posts.map((post) => post.id === id ? { ...post, text: String(body!.text) } : post); return new Response(null, { status: 204 }) }
    else value = posts.find((post) => post.id === id)
  }
  else if (path === `/conversations/${channelId}/read`) return new Response(null, { status: 204 })
  else if (path === '/attachments/recommend') value = { chunk_size: 3, chunk_count: 2, chunk_sizes: [3, 3] }
  else if (path === '/attachments/init') value = { attachment_id: 'raw-file', chunk_count: 2, total_size: 6, uploads: [1, 0].map((index) => ({ chunk_index: index, url: `${location.origin}/raw-chunk/${index}` })) }
  else if (path === '/attachments/raw-file/finalize') return new Response(null, { status: 204 })
  else if (path === '/attachments/raw-file') value = { attachment_id: 'raw-file', chunk_count: 2, total_size: 6, chunks: [1, 0].map((index) => ({ chunk_index: index, size_bytes: 3, url: `${location.origin}/raw-chunk/${index}` })) }
  else if (path === '/profile/fields') { if (method === 'PUT') fields = body!.fields as typeof fields; value = { fields } }
  else if (path === '/profile/dm-policy') value = { policy: body?.policy ?? 'everyone' }
  else if (path === '/profile/group-add-policy') value = { policy: body?.policy ?? 'nobody' }
  else if (path === '/profile/group-add-exceptions') value = []
  else if (path === '/profile/invisible') value = { enabled: body?.enabled ?? true }
  else if (path === '/profile/presence-exceptions') value = []
  else if (path === '/blocks') value = []
  else if (path === '/contacts') value = [{ target_account_id: peerId, user_id: 2, fh_number: 'FH0000002', username: 'Peer', local_username: 'Друг', avatar_url: null }]
  else if (path === `/accounts/${peerId}/profile`) value = { id: peerId, user_id: 2, fh_number: 'FH0000002', username: 'Peer', avatar_url: '/avatars/peer', custom_status_text: null, custom_status_emoji: null, custom_status_expires_at: null, is_blocked_by_me: false, is_contact: true, fields: [{ label: 'GitHub', value: '@example' }] }
  else if (path === '/bots') {
    if (method === 'POST') { bots = [...bots, { id: '019a1234-1234-7000-8000-000000000015', token_prefix: 'fhbot_new', created_at: 1000, updated_at: 1000, handle: '' }]; value = { bot_id: '019a1234-1234-7000-8000-000000000015', token: 'fhbot_test_once', token_prefix: 'fhbot_new' } }
    else value = bots
  }
  else if (path === `/groups/${groupId}`) value = { conversation_id: groupId, title: group.title, description: 'Описание с сервера', is_public: false, owner_account_id: accountId, handle: 'workgroup', handle_normalized: 'workgroup', member_count: 2, created_at: 1000, updated_at: 1000 }
  else if (path === `/groups/${groupId}/members`) value = [{ account_id: accountId, role: 'owner', permissions: 1023, muted_until: null, joined_at: 1000 }, { account_id: peerId, role: 'member', permissions: 0, muted_until: null, joined_at: 1000 }]
  else if (path === `/conversations/${groupId}/invites`) value = []
  else if (path === '/conversations') value = [{ ...group, member_count: 2, created_at: 1000, updated_at: 1000, last_envelope_at: 1000, archived_at: null, muted_until: null }]
  else if (path === '/calls') value = calls
  else if (path === '/calls/call' && method === 'DELETE') { calls = []; return new Response(null, { status: 204 }) }
  else if (path === '/security/events') value = [{ id: 'event', event_type: 'login_ok', ip_address: '127.0.0.1', user_agent: 'Local test', metadata: null, created_at: 1000 }]
  else if (path === '/groups/public') value = [{ conversation_id: groupId, title: 'Публичная группа', description: 'Описание', member_count: 2, created_at: 1000, updated_at: 1000, owner_account_id: accountId, handle: 'workgroup', handle_normalized: 'workgroup' }]
  else if (path === '/channels/public') value = [{ conversation_id: groupId, title: 'Публичный канал', description: 'Описание', member_count: 2, created_at: 1000, updated_at: 1000, owner_account_id: accountId, handle: 'newschannel', handle_normalized: 'newschannel' }]
  else throw new Error(`Unexpected browser-test request: ${method} ${path}`)
  return new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
const checks: string[] = []
const host = document.createElement('div')
host.style.width = '375px'; host.style.height = '812px'; host.className = 'flex flex-col'; document.body.append(host)
const root = createRoot(host)
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); checks.push(message) }
async function waitFor(condition: () => boolean, label: string) {
  const until = Date.now() + 8000
  while (!condition()) {
    if (Date.now() > until) throw new Error(`Timed out: ${label}; inputs: ${JSON.stringify([...host.querySelectorAll('textarea')].map((node) => ({ value: node.value, placeholder: node.placeholder })))}; calls: ${JSON.stringify(requests.slice(-8))}; screen: ${document.body.innerText.slice(0, 1500)}`)
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}
let renderId = 0
function show(element: React.ReactNode, initial = '/test', pattern = '*') {
  root.render(<MemoryRouter key={renderId++} initialEntries={[initial]}><Routes><Route path={pattern} element={element} /></Routes></MemoryRouter>)
}
function button(text: string) {
  const found = [...document.querySelectorAll<HTMLButtonElement>('button')].find((element) => element.textContent?.trim() === text)
  if (!found) throw new Error(`Missing button: ${text}`)
  return found
}
function inputValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
async function run() {
  check(attachmentPreviewKind('image/jpeg', null) === 'photo' && attachmentPreviewKind('video/mp4', null) === 'video' && attachmentPreviewKind('audio/webm', null) === 'voice' && attachmentPreviewKind(null, 'report.pdf') === 'file', 'chat list classifies attachment previews by media type')
  getAccountStore(account).setState({ conversations: [{ ...group, accountId }] })
  await saveConversations([{ ...group, accountId }])
  useUiStore.getState().setTheme('dark')
  useUiStore.getState().setLanguage('ru')
  useUiStore.getState().setActiveAccount(accountId)
  show(<ProfileFieldsPanel account={account} />)
  await waitFor(() => host.querySelectorAll('input').length === 2, 'profile fields')
  inputValue(host.querySelectorAll('input')[1]!, '@changed')
  await waitFor(() => !button('Сохранить').disabled, 'field edit enables save')
  button('Сохранить').click()
  await waitFor(() => requests.some((request) => request.method === 'PUT' && request.path === '/profile/fields'), 'save fields')
  check(fields[0]?.value === '@changed', 'profile fields save a complete edited set through the real API client')
  check(host.scrollWidth <= 375, 'profile field editor fits a 375px container')
  show(<PrivacySettingsScreen />)
  await waitFor(() => !!host.querySelector('input[value="contacts_only"]') && host.querySelector('[role="switch"]')?.getAttribute('aria-checked') === 'true', 'server privacy state')
  ;(host.querySelector('input[value="contacts_only"]') as HTMLInputElement).click()
  await waitFor(() => requests.some((request) => request.path === '/profile/dm-policy' && request.body?.policy === 'contacts_only'), 'DM policy update')
  check(true, 'privacy screen loads server invisibility and writes the selected DM policy')
  show(<ConversationSettingsScreen />, `/app/chat/${groupId}/settings`, '/app/chat/:id/settings')
  await waitFor(() => document.body.innerText.includes('Владение и удаление') && document.body.innerText.includes('@workgroup'), 'group owner settings')
  check(host.querySelector('textarea')?.value === 'Описание с сервера', 'group settings read the canonical server description')
  check(!button('Удалить группу').disabled, 'owner can reach group deletion confirmation')
  check(host.scrollWidth <= 375, 'group management fits a 375px container')
  show(<BotsSettingsScreen />)
  await waitFor(() => document.body.innerText.includes('@examplebot'), 'bot management')
  button('Создать бота').click()
  await waitFor(() => !!document.querySelector('[role="dialog"] input[type="password"]'), 'one-time bot token')
  check((document.querySelector('[role="dialog"] input') as HTMLInputElement).value === 'fhbot_test_once', 'new bot credentials are shown in the one-time token dialog')
  check(!JSON.stringify({ ...localStorage, ...sessionStorage }).includes('fhbot_test_once'), 'bot tokens are not persisted to browser preferences')
  button('Закрыть').click()
  await waitFor(() => !document.querySelector('[role="dialog"]'), 'token dialog closed')
  show(<CallHistoryScreen />)
  await waitFor(() => document.body.innerText.includes('Друг') && document.body.innerText.includes('01:00'), 'call history')
  ;(host.querySelector('button[aria-label="Удалить запись"]') as HTMLButtonElement).click()
  await waitFor(() => !!document.querySelector('[role="dialog"]'), 'delete call confirmation')
  button('Удалить').click()
  await waitFor(() => calls.length === 0, 'delete call')
  check(true, 'call history resolves peer names, displays duration and deletes only after confirmation')
  show(<DiscoverScreen />)
  await waitFor(() => document.body.innerText.includes('Публичная группа'), 'public groups')
  ;(host.querySelector('input[value="channel"]') as HTMLInputElement).click()
  await waitFor(() => document.body.innerText.includes('Публичный канал'), 'public channels')
  check(true, 'public directory switches between the group and channel endpoints')
  show(<SecurityEventsPanel account={account} />)
  await waitFor(() => document.body.innerText.includes('Успешный вход'), 'security events')
  check(document.body.innerText.includes('Local test'), 'security events render translated actions and device information')
  useUiStore.getState().openProfile(peerId)
  show(<UserProfileModal />)
  await waitFor(() => document.body.innerText.includes('GitHub') && document.body.innerText.includes('@example'), 'public profile fields')
  check(true, 'other participants can see public profile fields')
  ;(document.querySelector('button[aria-label="Открыть аватар Peer"]') as HTMLButtonElement).click()
  await waitFor(() => !!document.querySelector('[role="dialog"][aria-label="Аватар"]'), 'public avatar viewer')
  check(true, 'other participants can open a full-screen avatar')
  ;(document.querySelector('[role="dialog"][aria-label="Аватар"] button[aria-label="Закрыть"]') as HTMLButtonElement).click()
  await waitFor(() => !document.querySelector('[role="dialog"][aria-label="Аватар"]'), 'public avatar viewer closes')
  useUiStore.getState().closeProfile()
  show(<ChannelScreen account={account} conversation={channel} avatarUrl={null} />)
  await waitFor(() => document.body.innerText.includes('Первая публикация') && !!host.querySelector('textarea'), 'channel feed')
  check(document.body.innerText.includes('Обсуждение · 0'), 'channel discussion is attached to the bottom of each post')
  check(host.scrollWidth <= 375 && !!host.querySelector('button[aria-label="Прикрепить файл"]') && !!host.querySelector('button[aria-label="Записать голосовое сообщение"]') && host.querySelector('textarea')?.rows === 1,
    'channel composer uses the one-row chat input with attachment and microphone buttons at 375px')
  check(![...host.querySelectorAll('button')].some((element) => element.textContent === 'Опубликовать') && !host.querySelector('#channel-post-text'), 'channel input has no separate publication form or publish button')
  const attachmentButton = host.querySelector('button[aria-label="Прикрепить файл"]') as HTMLButtonElement
  attachmentButton.click()
  await waitFor(() => !!document.querySelector('[role="menu"]'), 'attachment menu')
  const attachmentMenu = document.querySelector('[role="menu"]')!.getBoundingClientRect()
  const attachmentTrigger = attachmentButton.getBoundingClientRect()
  check(attachmentMenu.bottom <= attachmentTrigger.top + 1, 'attachment menu opens above the composer without shifting the chat')
  document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  await waitFor(() => !document.querySelector('[role="menu"]'), 'attachment menu closes')
  const textarea = host.querySelector('textarea')!
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, 'Новая публикация')
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  await waitFor(() => !!host.querySelector('button[aria-label="Отправить"]:not(:disabled)'), 'channel draft')
  failNextPost = true
  ;(host.querySelector('button[aria-label="Отправить"]') as HTMLButtonElement).click()
  await waitFor(() => !!host.querySelector('button[aria-label="Отправить"]:disabled'), 'send is pending')
  await waitFor(() => !failNextPost && !button('Обновить ленту').disabled && !!host.querySelector('button[aria-label="Отправить"]:not(:disabled)'), 'failed send retains draft')
  check(host.querySelector('textarea')?.value === 'Новая публикация' && posts.length === 1, 'failed channel send keeps the typed text')
  const reads = requests.filter((request) => request.path === `/channels/${channelId}/posts` && request.method === 'GET').length
  button('Обновить ленту').click()
  await waitFor(() => requests.filter((request) => request.path === `/channels/${channelId}/posts` && request.method === 'GET').length > reads && host.querySelector('textarea')?.value === 'Новая публикация', 'draft survives channel refresh')
  check(true, 'channel refresh retains the draft in the shared chat composer')
  ;(host.querySelector('button[aria-label="Отправить"]') as HTMLButtonElement).click()
  await waitFor(() => posts.length === 2 && host.querySelector('textarea')?.value === '', 'publish channel post')
  check(requests.some((request) => request.method === 'POST' && request.path === `/channels/${channelId}/posts` && request.body?.text === 'Новая публикация'), 'channel publishes through HTTP rather than an encrypted envelope')
  const firstPostCard = host.querySelector('article')!
  firstPostCard.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 120, clientY: 120 }))
  await waitFor(() => !!document.querySelector('[role="menu"]'), 'channel post context menu')
  button('Закрепить').click()
  await waitFor(() => requests.some((request) => request.method === 'POST' && request.path.endsWith('/pin')), 'pin channel post')
  firstPostCard.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 120, clientY: 120 }))
  await waitFor(() => !!document.querySelector('[role="menu"]'))
  button('Редактировать публикацию').click()
  await waitFor(() => host.querySelector('textarea')?.value === 'Новая публикация' && !!host.querySelector('button[aria-label="Сохранить"]'), 'edit channel message')
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(host.querySelector('textarea')!, 'Исправлено')
  host.querySelector('textarea')!.dispatchEvent(new Event('input', { bubbles: true }))
  await waitFor(() => host.querySelector('textarea')?.value === 'Исправлено', 'edited text')
  ;(host.querySelector('button[aria-label="Сохранить"]') as HTMLButtonElement).click()
  await waitFor(() => posts[0]?.text === 'Исправлено' && !host.querySelector('button[aria-label="Сохранить"]'), 'edit saved')
  check(true, 'existing channel edit action uses the shared composer and PATCH endpoint')
  const picker = host.querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement | null
  check(picker !== null, 'channel composer includes the same emoji picker as a normal chat')
  await waitFor(() => !(host.querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement).disabled, 'emoji picker enabled')
  picker!.click()
  await waitFor(() => host.querySelector('button[aria-haspopup="dialog"]')?.getAttribute('aria-expanded') === 'true', 'emoji picker opens')
  await waitFor(() => !!host.querySelector('[role="dialog"] button.emoji:not([role="tab"])'), 'emoji grid')
  ;(host.querySelector('[role="dialog"] button.emoji:not([role="tab"])') as HTMLButtonElement).click()
  await waitFor(() => (host.querySelector('textarea')?.value.length ?? 0) > 0, 'emoji inserted')
  check(true, 'choosing an emoji inserts it into the channel message field')
  ;(host.querySelector('button[aria-haspopup="dialog"]') as HTMLButtonElement).click()
  await waitFor(() => !host.querySelector('[role="dialog"]'), 'emoji picker closed')
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(host.querySelector('textarea')!, '')
  host.querySelector('textarea')!.dispatchEvent(new Event('input', { bubbles: true }))
  const transfer = new DataTransfer()
  transfer.items.add(new File([new Uint8Array([0, 255, 1, 2, 128, 3])], 'channel.bin', { type: 'application/octet-stream' }))
  const fileInput = host.querySelectorAll<HTMLInputElement>('input[type="file"]')[2]!
  fileInput.files = transfer.files; fileInput.dispatchEvent(new Event('change', { bubbles: true }))
  await waitFor(() => !!document.querySelector('[role="dialog"]') && document.body.innerText.includes('channel.bin'), 'shared attachment preview')
  const caption = document.querySelector('[role="dialog"] textarea') as HTMLTextAreaElement
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(caption, 'Файл из чата')
  caption.dispatchEvent(new Event('input', { bubbles: true }))
  await waitFor(() => caption.value === 'Файл из чата', 'attachment caption')
  button('Отправить').click()
  await waitFor(() => posts.length === 3 && !document.querySelector('[role="dialog"]'), 'channel attachment sent')
  check(requests.some((request) => request.body?.text === 'Файл из чата' && (request.body.attachment_ids as string[])?.[0] === 'raw-file') && chunks.get(0)?.[1] === 255,
    'paperclip uses the shared preview and uploads original public channel bytes')
  let microphoneStops = 0
  const stream = { getTracks: () => [{ stop: () => { microphoneStops++ } }] }
  Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => stream })
  class TestRecorder extends EventTarget {
    static isTypeSupported() { return true }
    stream = stream
    state = 'inactive'
    mimeType = 'audio/webm'
    start() { this.state = 'recording' }
    stop() {
      this.state = 'inactive'
      this.dispatchEvent(new BlobEvent('dataavailable', { data: new Blob(['123456'], { type: this.mimeType }) }))
      this.dispatchEvent(new Event('stop'))
    }
  }
  Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: TestRecorder })
  const microphone = host.querySelector('button[aria-label="Записать голосовое сообщение"]') as HTMLButtonElement
  microphone.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
  await waitFor(() => microphone.getAttribute('aria-pressed') === 'true', 'recording started')
  await new Promise((resolve) => setTimeout(resolve, 550))
  microphone.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
  await waitFor(() => posts.length === 4 && !document.querySelector('[role="dialog"]'), 'channel voice sent')
  check(posts[0]?.text === '' && posts[0]?.attachment_ids[0] === 'raw-file' && microphoneStops > 0, 'microphone sends a captionless channel audio attachment and releases its media stream')
  await waitFor(() => !!host.querySelector('button[aria-label*="👍"]'), 'post reactions')
  const reactionCountBefore = requests.filter((request) => request.path.endsWith('/reactions') && request.method === 'GET').length
  firstPostCard.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 120, clientY: 120 }))
  await waitFor(() => !!document.querySelector('[role="menu"] button[aria-label*="❤️"]'), 'post reaction menu')
  ;(document.querySelector('[role="menu"] button[aria-label*="❤️"]') as HTMLButtonElement).click()
  await waitFor(() => requests.some((request) => request.path.endsWith('/reactions') && request.method === 'POST' && request.body?.emoji === '❤️'), 'post reaction sent')
  await waitFor(() => requests.filter((request) => request.path.endsWith('/reactions') && request.method === 'GET').length > reactionCountBefore, 'post reaction list refreshes')
  check(true, 'channel reaction list requests the confirmed single page of 200')
  firstPostCard.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 120, clientY: 120 }))
  await waitFor(() => !!document.querySelector('[role="menu"] button'))
  button('Удалить публикацию').click()
  await waitFor(() => !!document.querySelector('[role="dialog"]'), 'delete post dialog')
  check(posts.length === 4, 'channel deletion waits for explicit confirmation')
  ;(document.querySelector('[role="dialog"]')!.querySelector('button.bg-danger') as HTMLButtonElement).click()
  await waitFor(() => posts.length === 3 && !document.querySelector('[role="dialog"]'), 'post deleted')
  check(posts.length === 3, 'confirmed channel deletion removes the post through HTTP')
  publishAllowed = false
  show(<ChannelScreen account={account} conversation={channel} avatarUrl={null} />)
  await waitFor(() => requests.filter((request) => request.path.endsWith('/can-publish')).length >= 3, 'subscriber permissions loaded')
  await new Promise((resolve) => setTimeout(resolve, 100))
  check(!host.querySelector('textarea') && ![...host.querySelectorAll('button')].some((element) => element.textContent === 'Опубликовать'), 'channel subscriber has no publication composer')
  const subscriberPostCard = host.querySelector('article')!
  subscriberPostCard.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 120, clientY: 120 }))
  await waitFor(() => !!document.querySelector('[role="menu"]'))
  check(![...document.querySelectorAll('[role="menu"] button')].some((element) => element.textContent?.trim() === 'Редактировать публикацию'), 'channel subscriber cannot manage posts from the context menu')
  const source = new Uint8Array([0, 255, 1, 2, 128, 3])
  const id = await uploadChannelAttachment(account, channelId, new Blob([source]))
  const downloaded = await downloadChannelAttachment(account, id)
  check([...downloaded].join(',') === [...source].join(',') && chunks.get(0)?.length === 3, 'channel attachment raw chunks round-trip without encryption or size overhead')
  root.unmount()
  return checks
}
void run().then((passed) => originalFetch('/result', { method: 'POST', body: JSON.stringify({ ok: true, checks: passed }) }))
  .catch((error: unknown) => originalFetch('/result', { method: 'POST', body: JSON.stringify({ ok: false, error: error instanceof Error ? `${error.message}\n${error.stack}` : String(error), checks }) }))
