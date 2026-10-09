import { Copy, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createInvite, listInvites, revokeInvite, type Invite, type InviteKind } from '../../api/groups'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useCopy } from '../../hooks/useCopy'
import { useToast } from '../../hooks/useToast'
import { joinPath } from '../../router/paths'
import type { Account } from '../../types'
import { formatDateOnly } from '../../utils/chatTime'
import { Button } from '../ui/Button'
import { SettingsCard } from '../settings/Section'
import { Skeleton } from '../ui/Skeleton'

export type GroupInvitesPanelProps = {
  account: Account
  conversationId: string
}

/**
 * The ways into a group that do not need the person to already be a contact.
 *
 * This is the only way to grow a group after it is created — there is no
 * endpoint that adds a member by account id — so the panel is where a group
 * actually gathers people. The token is joined by the page at `/join/<token>`,
 * which is what the copied link points at.
 *
 * Groups only: an invite can be minted for a channel, but the join endpoint
 * refuses every kind but a group, so offering one would produce a link that
 * cannot work.
 */
export function GroupInvitesPanel({ account, conversationId }: GroupInvitesPanelProps) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('conversation')
  const copy = useCopy()

  const [invites, setInvites] = useState<Invite[] | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    void listInvites(account, conversationId)
      .then((loaded) => {
        if (!cancelled) {
          setInvites(loaded)
        }
      })
      .catch((error: unknown) => {
        fail(error)
        if (!cancelled) {
          setInvites([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [account, conversationId, fail])

  async function create(kind: InviteKind): Promise<void> {
    setBusy(true)
    try {
      const invite = await createInvite(account, conversationId, kind)
      setInvites((current) => [invite, ...(current ?? [])])
      toast.notify({ kind: 'success', message: t('conversation.invites.created') })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  async function revoke(invite: Invite): Promise<void> {
    setBusy(true)
    try {
      await revokeInvite(account, invite.id)
      setInvites((current) => (current ?? []).filter((entry) => entry.id !== invite.id))
      toast.notify({ kind: 'success', message: t('conversation.invites.revoked') })
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingsCard title={t('conversation.invites.title')} description={t('conversation.invites.description')}>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => {
            void create('permanent')
          }}
        >
          {t('conversation.invites.createPermanent')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => {
            void create('one_time')
          }}
        >
          {t('conversation.invites.createOneTime')}
        </Button>
      </div>

      {invites === null ? (
        <div className="flex flex-col gap-1" role="status" aria-label={t('common.loading')}>
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ) : invites.length === 0 ? (
        <p className="text-xs text-fg-muted">{t('conversation.invites.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-2 py-1.5"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm text-fg">
                  {invite.kind === 'one_time'
                    ? t('conversation.invites.kind.oneTime')
                    : t('conversation.invites.kind.permanent')}
                </span>
                <span className="text-xs text-fg-muted">
                  {t('conversation.invites.used', { count: invite.usedCount })} ·{' '}
                  {formatDateOnly(invite.createdAt, i18n.language)}
                </span>
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void copy(`${window.location.origin}${joinPath(invite.token)}`)
                }}
              >
                <Copy className="size-4" aria-hidden />
                {t('conversation.invites.copy')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  void revoke(invite)
                }}
              >
                <Trash2 className="size-4" aria-hidden />
                {t('conversation.invites.revoke')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  )
}
