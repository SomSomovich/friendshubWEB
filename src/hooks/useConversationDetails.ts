import { useCallback } from 'react'
import { getChannel, type ChannelDetail } from '../api/channels'
import { getGroup, type GroupDetail } from '../api/groups'
import type { Account, ConversationKind } from '../types'
import { useAccountResource } from './useAccountResource'

export function useConversationDetails(account: Account, conversationId: string, kind: ConversationKind | null, enabled = true) {
  const load = useCallback((current: Account): Promise<GroupDetail | ChannelDetail | null> => {
    if (!enabled) return Promise.resolve(null)
    if (kind === 'group') return getGroup(current, conversationId)
    if (kind === 'channel') return getChannel(current, conversationId)
    return Promise.resolve(null)
  }, [conversationId, kind, enabled])
  return useAccountResource<GroupDetail | ChannelDetail | null>(account, load, `${conversationId}:${kind}:${enabled}`)
}
