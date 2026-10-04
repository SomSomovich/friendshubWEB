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
