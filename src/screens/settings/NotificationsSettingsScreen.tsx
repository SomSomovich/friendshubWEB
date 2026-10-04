import { PushPanel, SoundPanel } from '../../components/settings/NotificationsPanel'
import { useActiveAccount } from '../../hooks/useActiveAccount'
import { SettingsSectionScreen } from './SettingsSectionScreen'

/** Message sounds and the browser's notification permission. */
export function NotificationsSettingsScreen() {
  const account = useActiveAccount()
  if (account === null) {
    return null
  }

  return (
    <SettingsSectionScreen section="notifications">
      <SoundPanel account={account} />
      <PushPanel />
    </SettingsSectionScreen>
  )
}
