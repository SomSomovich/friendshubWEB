import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { listChannelPosts } from '../../api/channel_posts'
import { getChannelAnalytics } from '../../api/channels'
import { useAccountResource } from '../../hooks/useAccountResource'
import type { Account } from '../../types'
import { Button } from '../ui/Button'
import { PanelError } from '../settings/PanelError'
import { PanelSkeleton } from '../settings/PanelSkeleton'
import { SettingsCard } from '../settings/Section'

export function ChannelAnalyticsPanel({ account, conversationId }: { account: Account; conversationId: string }) {
  const { t } = useTranslation()
  const load = useCallback(async (current: Account) => {
    const [analytics, posts] = await Promise.all([getChannelAnalytics(current, conversationId), listChannelPosts(current, conversationId, { limit: 50 })])
    return { analytics, posts }
  }, [conversationId])
  const resource = useAccountResource(account, load, conversationId)
  return <SettingsCard title={t('conversation.management.analytics')} description={t('conversation.management.analyticsHint')}>
    {resource.error !== null ? <PanelError message={resource.error} onRetry={resource.reload} />
      : resource.data === null ? <PanelSkeleton /> : resource.data.analytics.posts.length === 0
        ? <p className="text-xs text-fg-muted">{t('conversation.management.noPosts')}</p>
        : <dl className="flex flex-col gap-1">{resource.data.analytics.posts.map((post, index) => (
          <div key={post.postId} className="flex justify-between gap-2 border-t border-border py-2 first:border-t-0">
            <dt className="text-sm text-fg">{resource.data?.posts.find((entry) => entry.id === post.postId)?.text.slice(0, 120) || t('conversation.management.postNumber', { number: index + 1 })}</dt>
            <dd className="text-sm text-fg-muted tabular-nums">{t('conversation.management.views', { count: post.views })}</dd>
          </div>
        ))}</dl>}
    <Button variant="secondary" size="sm" className="self-start" onClick={resource.reload}>{t('conversation.management.refresh')}</Button>
  </SettingsCard>
}
