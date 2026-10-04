import { AccountsPanel } from '../../components/settings/AccountsPanel'
import { SettingsSectionScreen } from './SettingsSectionScreen'

/** The accounts signed in to this browser. */
export function AccountsSettingsScreen() {
  return (
    <SettingsSectionScreen section="accounts">
      <AccountsPanel />
    </SettingsSectionScreen>
  )
}
