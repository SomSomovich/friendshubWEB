import { createBrowserRouter } from 'react-router-dom'
import { ChatIndexScreen } from '../screens/ChatIndexScreen'
import { ConnectScreen } from '../screens/ConnectScreen'
import { TwoFactorScreen } from '../screens/TwoFactorScreen'
import { TwoFactorSetupScreen } from '../screens/TwoFactorSetupScreen'
import { BotChatScreen } from '../screens/BotChatScreen'
import { ChatScreen } from '../screens/ChatScreen'
import { CreateChannelScreen } from '../screens/CreateChannelScreen'
import { CreateGroupScreen } from '../screens/CreateGroupScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { NotFoundScreen } from '../screens/NotFoundScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { PublicLandingScreen } from '../screens/PublicLandingScreen'
import { RegisterScreen } from '../screens/RegisterScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { AboutSettingsScreen } from '../screens/settings/AboutSettingsScreen'
import { AccountSettingsScreen } from '../screens/settings/AccountSettingsScreen'
import { AccountsSettingsScreen } from '../screens/settings/AccountsSettingsScreen'
import { AppearanceSettingsScreen } from '../screens/settings/AppearanceSettingsScreen'
import { NotificationsSettingsScreen } from '../screens/settings/NotificationsSettingsScreen'
import { PrivacySettingsScreen } from '../screens/settings/PrivacySettingsScreen'
import { SecuritySettingsScreen } from '../screens/settings/SecuritySettingsScreen'
import { AppLayout } from '../screens/AppLayout'
import { RequireAuth, RequireGuest } from './guards'
import { CHAT_ROUTE_PATTERN, ROUTES } from './paths'

/**
 * The route tree.
 *
 * The landing page is outside both guards: it is the public face of the product
 * and also useful to a signed-in visitor (it offers to open the app).
 */
export const router = createBrowserRouter([
  { path: ROUTES.landing, element: <PublicLandingScreen /> },
  {
    element: <RequireGuest />,
    children: [
      { path: ROUTES.login, element: <LoginScreen /> },
      { path: ROUTES.register, element: <RegisterScreen /> },
      { path: ROUTES.twoFactor, element: <TwoFactorScreen /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: ROUTES.connect, element: <ConnectScreen /> },
      {
        path: ROUTES.app,
        element: <AppLayout />,
        children: [
          { index: true, element: <ChatIndexScreen /> },
          { path: '2fa', element: <TwoFactorSetupScreen /> },
          { path: CHAT_ROUTE_PATTERN, element: <ChatScreen /> },
          { path: 'bot/:id', element: <BotChatScreen /> },
          { path: 'settings', element: <SettingsScreen /> },
          { path: 'settings/account', element: <AccountSettingsScreen /> },
          { path: 'settings/appearance', element: <AppearanceSettingsScreen /> },
          { path: 'settings/privacy', element: <PrivacySettingsScreen /> },
          { path: 'settings/security', element: <SecuritySettingsScreen /> },
          { path: 'settings/security/2fa', element: <TwoFactorSetupScreen /> },
          { path: 'settings/notifications', element: <NotificationsSettingsScreen /> },
          { path: 'settings/accounts', element: <AccountsSettingsScreen /> },
          { path: 'settings/about', element: <AboutSettingsScreen /> },
          { path: 'profile', element: <ProfileScreen /> },
          { path: 'create-group', element: <CreateGroupScreen /> },
          { path: 'create-channel', element: <CreateChannelScreen /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundScreen /> },
])
