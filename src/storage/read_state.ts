import { nowSeconds } from '../utils/time'
import { getSetting, setSetting } from './settings'

/**
 * Local per-conversation bookkeeping: how far this device has read, and which
 * account a direct conversation belongs to.
 *
 * How far this device has read each conversation.
 *
 * Local by necessity: the server has no read model for conversations (read
 * receipts are an envelope type this client does not send yet), so "unread"
 * here means "arrived since this browser last opened it" — which is what the
 * badges on the chat list actually show.
 *
 * One row per account rather than one per conversation: the whole map is small
 * and reading it is a single get.
 */

export type ReadState = Record<string, number>

function readStateKey(accountId: string): string {
  return `read_state:${accountId}`
}

export async function loadReadState(accountId: string): Promise<ReadState> {
  const raw = await getSetting(readStateKey(accountId))
  if (raw === null) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {}
    }
    const state: ReadState = {}
    for (const [conversationId, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        state[conversationId] = value
      }
    }
    return state
  } catch (error) {
    console.warn('[storage] the stored read state is unreadable', error)
    return {}
  }
}

export async function markConversationRead(
  accountId: string,
  conversationId: string,
  at: number = nowSeconds(),
): Promise<void> {
  const state = await loadReadState(accountId)
  state[conversationId] = at
  await setSetting(readStateKey(accountId), JSON.stringify(state))
}

export async function markConversationUnread(
  accountId: string,
  conversationId: string,
): Promise<void> {
  const state = await loadReadState(accountId)
  // Clearing it entirely means "never read", which makes every stored message
  // count as unread.
  delete state[conversationId]
  await setSetting(readStateKey(accountId), JSON.stringify(state))
}

function peerCacheKey(accountId: string): string {
  return `conversation_peers:${accountId}`
}

/**
 * Which account each direct conversation is with.
 *
 * The conversation list carries no peer id, so it has to be asked for once per
 * conversation; remembering it keeps that to one request rather than one per
 * render.
 */
export async function loadPeerCache(accountId: string): Promise<Record<string, string>> {
  const raw = await getSetting(peerCacheKey(accountId))
  if (raw === null) {
    return {}
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {}
    }
    const cache: Record<string, string> = {}
    for (const [conversationId, peerId] of Object.entries(parsed)) {
      if (typeof peerId === 'string') {
        cache[conversationId] = peerId
      }
    }
    return cache
  } catch (error) {
    console.warn('[storage] the stored peer cache is unreadable', error)
    return {}
  }
}

export async function rememberPeer(accountId: string, conversationId: string, peerAccountId: string): Promise<void> {
  const cache = await loadPeerCache(accountId)
  cache[conversationId] = peerAccountId
  await setSetting(peerCacheKey(accountId), JSON.stringify(cache))
}

/**
 * Conversations this device removed.
 *
 * The server has no endpoint that deletes one (a group can be left, a direct
 * chat cannot), and every sync would hand it straight back. So "delete" is
 * recorded as a moment in time instead: the conversation stays hidden until
 * something happens in it afterwards, which is also what a messenger's delete is
 * supposed to mean — the chat comes back when the other side writes again.
 */
function hiddenKey(accountId: string): string {
  return `conversation_hidden:${accountId}`
}

export async function loadHiddenConversations(accountId: string): Promise<Record<string, number>> {
  return loadNumberMap(hiddenKey(accountId), 'hidden conversations')
}

export async function hideConversation(
  accountId: string,
  conversationId: string,
  at: number = nowSeconds(),
): Promise<void> {
  await putNumberMapEntry(hiddenKey(accountId), 'hidden conversations', conversationId, at)
}

/**
 * How far back the local history of a conversation was cleared.
 *
 * Saved Messages are replayed from the server when the local window is empty,
 * so without this a cleared history would come straight back on the next visit.
 * The value is the newest `serverTimestamp` that was deleted, which is exactly
 * the cursor that history endpoint pages by.
 */
function historyCursorKey(accountId: string): string {
  return `history_cleared:${accountId}`
}

export async function loadHistoryCursors(accountId: string): Promise<Record<string, number>> {
  return loadNumberMap(historyCursorKey(accountId), 'history cursors')
}

export async function setHistoryCursor(
  accountId: string,
  conversationId: string,
  serverTimestamp: number,
): Promise<void> {
  await putNumberMapEntry(historyCursorKey(accountId), 'history cursors', conversationId, serverTimestamp)
}

/**
 * Conversations whose pinned banner the user closed.
 *
 * A local preference, and a per-conversation one: closing the banner in one chat
 * says nothing about the next one, and the banner is the only place a pin is
 * visible, so it returns when a message is pinned again in that chat.
 */
function pinnedBannerKey(accountId: string): string {
  return `pinned_banner_hidden:${accountId}`
}

export async function loadPinnedBannerHidden(accountId: string): Promise<Record<string, number>> {
  return loadNumberMap(pinnedBannerKey(accountId), 'pinned banner preferences')
}

export async function setPinnedBannerHidden(
  accountId: string,
  conversationId: string,
  hidden: boolean,
): Promise<void> {
  const key = pinnedBannerKey(accountId)
  if (hidden) {
    await putNumberMapEntry(key, 'pinned banner preferences', conversationId, nowSeconds())
    return
  }
  await deleteNumberMapEntry(key, 'pinned banner preferences', conversationId)
}

async function loadNumberMap(key: string, label: string): Promise<Record<string, number>> {
  const raw = await getSetting(key)
  if (raw === null) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {}
    }
    const map: Record<string, number> = {}
    for (const [entryKey, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        map[entryKey] = value
      }
    }
    return map
  } catch (error) {
    console.warn(`[storage] the stored ${label} are unreadable`, error)
    return {}
  }
}

async function putNumberMapEntry(
  key: string,
  label: string,
  entryKey: string,
  value: number,
): Promise<void> {
  const map = await loadNumberMap(key, label)
  map[entryKey] = value
  await setSetting(key, JSON.stringify(map))
}

async function deleteNumberMapEntry(
  key: string,
  label: string,
  entryKey: string,
): Promise<void> {
  const map = await loadNumberMap(key, label)
  delete map[entryKey]
  await setSetting(key, JSON.stringify(map))
}
