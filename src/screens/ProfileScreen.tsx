import { Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { avatarImageUrl } from '../api/avatars'
import { getMe, type MeResponse } from '../api/auth'
import { ScreenHeader } from '../components/layout/ScreenHeader'
import { SettingsCard, SettingsRow } from '../components/settings/Section'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { useActiveAccount } from '../hooks/useActiveAccount'
import { useCopy } from '../hooks/useCopy'
import { ROUTES, settingsPath } from '../router/paths'

/** The signed-in account's own profile, as other people see it. */
export function ProfileScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const copy = useCopy()
  // The hook subscribes to the account revision, so a rename or a new avatar
  // re-renders this screen — and re-reads `/me`, which is where the custom
  // status comes from.
  const account = useActiveAccount()
  const [me, setMe] = useState<MeResponse | null>(null)

  useEffect(() => {
    if (account === null) {
      return
    }
    let cancelled = false
    void getMe(account)
      .then((loaded) => {
        if (!cancelled) {
          setMe(loaded)
        }
      })
      .catch((error: unknown) => {
        console.warn('[profile] the account details could not be read', error)
      })
    return () => {
      cancelled = true
    }
  }, [account])

  if (account === null) {
    return null
  }

  const status = me?.customStatusText ?? null
  const emoji = me?.customStatusEmoji ?? null

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg text-fg">
      <ScreenHeader
        title={t('settings.profile.title')}
        onBack={() => {
          void navigate(ROUTES.app)
        }}
        backMode="always"
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
          {/* No card title: the screen is already called "Profile", and a second
              one directly under it would be the same word twice. */}
          <section className="flex flex-col gap-3 rounded-xl border border-border bg-bg-elevated p-3">
            <div className="flex items-center gap-4">
              <Avatar
                name={account.username}
                src={avatarImageUrl(account.id)}
                size="xl"
                label={account.username}
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-base font-semibold text-fg">{account.username}</span>
                <span className="text-sm text-fg-muted">{account.fhNumber}</span>
                {status === null && emoji === null ? null : (
                  <span className="truncate text-sm text-fg-muted">
                    {emoji} {status}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void navigate(settingsPath('account'))
                }}
              >
                <Pencil className="size-4" aria-hidden />
                {t('settings.profile.edit')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  // The FH number *is* the shareable handle: there is no deep
                  // link that adds a contact, and inventing one would produce a
                  // link that does nothing when it is opened.
                  void copy(account.fhNumber)
                }}
              >
                {t('settings.profile.share')}
              </Button>
            </div>
          </section>

          <SettingsCard title={t('settings.account.fhNumber')} description={t('settings.account.fhNumberHint')}>
            <SettingsRow label={account.fhNumber}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void copy(account.fhNumber)
                }}
              >
                {t('settings.copy')}
              </Button>
            </SettingsRow>
          </SettingsCard>
        </div>
      </div>
    </div>
  )
}
