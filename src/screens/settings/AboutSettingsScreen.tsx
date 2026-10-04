import { ExternalLink, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { signOutAccount } from '../../auth/session'
import { SettingsCard, SettingsRow } from '../../components/settings/Section'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useActionReporter } from '../../hooks/useActionReporter'
import { useActiveAccount } from '../../hooks/useActiveAccount'
import { useCopy } from '../../hooks/useCopy'
import { APP_VERSION, CRYPTO_MODULE_URL, REPOSITORY_URL } from '../../version'
import { SettingsSectionScreen } from './SettingsSectionScreen'

/** What the app is, where its source lives, and the way out. */
export function AboutSettingsScreen() {
  const { t } = useTranslation()
  const copy = useCopy()
  const fail = useActionReporter('settings')
  const account = useActiveAccount()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function logout(): Promise<void> {
    if (account === null) {
      return
    }
    setBusy(true)
    try {
      // The account is forgotten, so the guard on the next render sends the
      // visitor to the sign-in screen — no navigation from here.
      await signOutAccount(account)
    } catch (error) {
      fail(error)
      setBusy(false)
    }
  }

  return (
    <SettingsSectionScreen section="about">
      <SettingsCard title={t('settings.about.app')}>
        <SettingsRow label={t('settings.about.version')}>
          <span className="font-mono text-sm text-fg-muted">{APP_VERSION}</span>
        </SettingsRow>

        <SettingsRow label={t('settings.about.repository')} description={t('settings.about.repositoryHint')}>
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            GitHub
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </SettingsRow>

        <SettingsRow label={t('settings.about.license')} description={t('settings.about.licenseHint')}>
          <span className="text-sm text-fg-muted">AGPL-3.0</span>
        </SettingsRow>

        <SettingsRow label={t('settings.about.cryptoModule')} description={t('settings.about.cryptoModuleHint')}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void copy(CRYPTO_MODULE_URL)
            }}
          >
            {t('settings.copy')}
          </Button>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title={t('settings.about.session')}>
        <Button
          variant="danger"
          onClick={() => {
            setConfirming(true)
          }}
        >
          <LogOut className="size-4" aria-hidden />
          {t('settings.about.logout')}
        </Button>
      </SettingsCard>

      <ConfirmDialog
        open={confirming}
        title={t('settings.about.logout')}
        description={t('settings.about.logoutHint')}
        confirmLabel={t('settings.about.logout')}
        danger
        busy={busy}
        onConfirm={() => {
          void logout()
        }}
        onClose={() => {
          setConfirming(false)
        }}
      />
    </SettingsSectionScreen>
  )
}
