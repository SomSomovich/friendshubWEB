import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listSessions, revokeAllSessions, revokeSession, type SessionInfo } from '../../api/sessions'
import { forgetAccount } from '../../auth/session'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useToast } from '../../hooks/useToast'
import type { Account } from '../../types'
import { formatFullTimestamp } from '../../utils/chatTime'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Spinner } from '../ui/Spinner'
import { SettingsCard } from './Section'

/** Sessions of this account, and the two ways to end them. */
export function SessionsPanel({ account }: { account: Account }) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const fail = useActionReporter('sessions')

  const [sessions, setSessions] = useState<SessionInfo[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)
  const [revision, setRevision] = useState(0)

  // One read path: the first load and every refresh after an action both come
  // through here, so the two can never disagree about what is on screen.
  useEffect(() => {
    let cancelled = false

    void listSessions(account)
      .then((loaded) => {
        if (!cancelled) {
          setSessions(loaded)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          fail(error)
        }
      })

    return () => {
      cancelled = true
    }
  }, [account, revision, fail])

  async function revoke(session: SessionInfo): Promise<void> {
    setBusyId(session.id)
    try {
      await revokeSession(account, session.id)
      if (session.isCurrent) {
        // Revoking the session this tab is using signs it out: nothing else can
        // keep the token alive.
        await forgetAccount(account)
        return
      }
      setRevision((value) => value + 1)
      toast.notify({ kind: 'success', message: t('settings.security.sessionRevoked') })
    } catch (error) {
      fail(error)
    } finally {
      setBusyId(null)
    }
  }

  async function revokeEverything(): Promise<void> {
    setBusyId('all')
    try {
      await revokeAllSessions(account)
      setConfirmAll(false)
      // The endpoint ends this session too, so there is nothing left to keep.
      await forgetAccount(account)
    } catch (error) {
      fail(error)
      setBusyId(null)
    }
  }

  return (
    <SettingsCard title={t('settings.security.sessions')} description={t('settings.security.sessionsHint')}>
      {sessions === null ? (
        <div className="flex justify-center py-4">
          <Spinner className="size-4 text-fg-muted" />
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-bg p-2.5"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-2 text-sm text-fg">
                  <span className="truncate">{session.ipAddress}</span>
                  {session.isCurrent ? (
                    <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-fg">
                      {t('settings.security.currentSession')}
                    </span>
                  ) : null}
                </span>
                <span className="truncate text-xs text-fg-muted" title={session.userAgent}>
                  {session.userAgent.length === 0
                    ? t('settings.security.unknownAgent')
                    : session.userAgent}
                </span>
                <span className="text-xs text-fg-muted">
                  {t('settings.security.signedInAt', {
                    time: formatFullTimestamp(session.createdAt, i18n.language),
                  })}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                loading={busyId === session.id}
                disabled={busyId !== null}
                onClick={() => {
                  void revoke(session)
                }}
              >
                {t('settings.security.revoke')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-border pt-3">
        <Button variant="danger" size="sm" onClick={() => { setConfirmAll(true) }}>
          {t('settings.security.revokeAll')}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmAll}
        title={t('settings.security.revokeAll')}
        description={t('settings.security.revokeAllHint')}
        confirmLabel={t('settings.security.revokeAll')}
        danger
        busy={busyId === 'all'}
        onConfirm={() => {
          void revokeEverything()
        }}
        onClose={() => {
          setConfirmAll(false)
        }}
      />
    </SettingsCard>
  )
}
