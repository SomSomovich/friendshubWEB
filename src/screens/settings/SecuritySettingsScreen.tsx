import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DeviceHistoryPanel } from '../../components/settings/DeviceHistoryPanel'
import { HistorySyncPanel } from '../../components/settings/HistorySyncPanel'
import { SecurityEventsPanel } from '../../components/settings/SecurityEventsPanel'
import { DevicesPanel } from '../../components/settings/DevicesPanel'
import { SettingsCard, SettingsNavRow } from '../../components/settings/Section'
import { SessionsPanel } from '../../components/settings/SessionsPanel'
import { useActiveAccount } from '../../hooks/useActiveAccount'
import { ROUTES } from '../../router/paths'
import { SettingsSectionScreen } from './SettingsSectionScreen'

/** Two-factor authentication, active sessions and the account's devices. */
export function SecuritySettingsScreen() {
  const { t } = useTranslation()
  const account = useActiveAccount()
  if (account === null) {
    return null
  }

  return (
    <SettingsSectionScreen section="security">
      <SettingsCard title={t('settings.security.account')}>
        <SettingsNavRow
          to={ROUTES.twoFactorSetup}
          label={t('twoFactorSetup.title')}
          // The row doubles as the state indicator: 2FA has no switch here, only
          // a screen of its own.
          description={account.totpEnabled ? t('twoFactorSetup.enabled') : t('twoFactorSetup.offTitle')}
          icon={ShieldCheck}
        />
      </SettingsCard>

      <SessionsPanel account={account} />
      <DevicesPanel account={account} />
      <HistorySyncPanel key={`history:${account.id}`} account={account} />
      <DeviceHistoryPanel key={`http-history:${account.id}`} account={account} />
      <SecurityEventsPanel key={account.id} account={account} />
    </SettingsSectionScreen>
  )
}
