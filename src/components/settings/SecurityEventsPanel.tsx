import { useTranslation } from 'react-i18next'
import { listSecurityEvents } from '../../api/security'
import { useAccountResource } from '../../hooks/useAccountResource'
import type { Account } from '../../types'
import { formatFullTimestamp } from '../../utils/chatTime'
import { Button } from '../ui/Button'
import { PanelError } from './PanelError'
import { PanelSkeleton } from './PanelSkeleton'
import { SettingsCard } from './Section'

const EVENT_KEYS = {
  registered: 'registered', login_ok: 'loginOk', login_fail: 'loginFail',
  totp_enabled: 'totpEnabled', totp_disabled: 'totpDisabled',
  device_registered: 'deviceRegistered', device_revoked: 'deviceRevoked', sessions_revoked: 'sessionsRevoked',
  account_deletion_initiated: 'deletionInitiated', account_deletion_confirmed: 'deletionConfirmed',
  group_owner_transferred: 'groupTransferred', channel_owner_transferred: 'channelTransferred',
  group_deleted: 'groupDeleted', channel_deleted: 'channelDeleted',
} as const
export function SecurityEventsPanel({ account }: { account: Account }) {
  const { t, i18n } = useTranslation()
  const resource = useAccountResource(account, listSecurityEvents)
  return <SettingsCard title={t('settings.security.events.title')} description={t('settings.security.events.hint')}>
    {resource.error !== null ? <PanelError message={resource.error} onRetry={resource.reload} />
      : resource.data === null ? <PanelSkeleton /> : resource.data.length === 0
        ? <p className="text-xs text-fg-muted">{t('settings.security.events.empty')}</p>
        : <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">{resource.data.map((event) => {
          const key = EVENT_KEYS[event.eventType as keyof typeof EVENT_KEYS]
          return <li key={event.id} className="flex flex-col gap-1 rounded-lg border border-border bg-bg p-2.5">
            <p className="text-sm text-fg">{key ? t(`settings.security.events.types.${key}`) : event.eventType}</p>
            <time className="text-xs text-fg-muted" dateTime={new Date(event.createdAt * 1000).toISOString()}>{formatFullTimestamp(event.createdAt, i18n.language)}</time>
            {event.ipAddress ? <p className="text-xs text-fg-muted">{event.ipAddress}</p> : null}
            {event.userAgent ? <p className="text-xs text-fg-muted break-words">{event.userAgent}</p> : null}
          </li>
        })}</ul>}
    <Button className="self-start" variant="secondary" size="sm" onClick={resource.reload}>{t('conversation.management.refresh')}</Button>
  </SettingsCard>
}
