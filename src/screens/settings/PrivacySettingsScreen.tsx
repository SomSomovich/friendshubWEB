import {
  BlockedPanel,
  InvisiblePanel,
  PresenceExceptionsPanel,
} from '../../components/settings/PrivacyPanels'
import { ContactPoliciesPanel } from '../../components/settings/ContactPoliciesPanel'
import { useActiveAccount } from '../../hooks/useActiveAccount'
import { SettingsSectionScreen } from './SettingsSectionScreen'

/** Who can see this account, and who cannot reach it at all. */
export function PrivacySettingsScreen() {
  const account = useActiveAccount()
  if (account === null) {
    return null
  }

  return (
    <SettingsSectionScreen section="privacy">
      <ContactPoliciesPanel key={account.id} account={account} />
      <InvisiblePanel key={`invisible:${account.id}`} account={account} />
      <PresenceExceptionsPanel account={account} />
      <BlockedPanel account={account} />
    </SettingsSectionScreen>
  )
}
