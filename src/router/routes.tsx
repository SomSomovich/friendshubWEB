import { Suspense, lazy, type ComponentType } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { RouteFallback } from '../components/RouteFallback'
import { ChatIndexScreen } from '../screens/ChatIndexScreen'
import { ConnectScreen } from '../screens/ConnectScreen'
import { TwoFactorScreen } from '../screens/TwoFactorScreen'
import { TwoFactorSetupScreen } from '../screens/TwoFactorSetupScreen'
import { ChatScreen } from '../screens/ChatScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { NotFoundScreen } from '../screens/NotFoundScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { PublicLandingScreen } from '../screens/PublicLandingScreen'
import { RegisterScreen } from '../screens/RegisterScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { AppLayout } from '../screens/AppLayout'
import { RequireAuth, RequireGuest } from './guards'
import { CHAT_ROUTE_PATTERN, ROUTES } from './paths'

/**
 * The route tree.
 *
 * The landing page is outside both guards: it is the public face of the product
 * and also useful to a signed-in visitor (it offers to open the app).
 *
 * Four groups stay eager, and the split is deliberate rather than what fell out
 * of the imports:
 *
 *  - the shell and the chat itself, because they are where every session starts
 *    and a round trip before the first message would be felt;
 *  - sign-in, registration and 2FA, because a visitor arriving from a link has
 *    nothing else on screen while the form loads;
 *  - settings' *index*, which is small and is where the lazy sub-pages hang from.
 *
 * Everything behind the settings index — the sub-pages and the two creation
 * wizards — is fetched when it is opened. They are the deepest screens in the
 * app and the least visited, which is exactly the trade a lazy route is for.
 */
const AccountSettingsScreen = lazyScreen('AccountSettingsScreen', () =>
  import('../screens/settings/AccountSettingsScreen'),
)
const AppearanceSettingsScreen = lazyScreen('AppearanceSettingsScreen', () =>
  import('../screens/settings/AppearanceSettingsScreen'),
)
const PrivacySettingsScreen = lazyScreen('PrivacySettingsScreen', () =>
  import('../screens/settings/PrivacySettingsScreen'),
)
const SecuritySettingsScreen = lazyScreen('SecuritySettingsScreen', () =>
  import('../screens/settings/SecuritySettingsScreen'),
)
const NotificationsSettingsScreen = lazyScreen('NotificationsSettingsScreen', () =>
  import('../screens/settings/NotificationsSettingsScreen'),
)
const AccountsSettingsScreen = lazyScreen('AccountsSettingsScreen', () =>
  import('../screens/settings/AccountsSettingsScreen'),
)
const AboutSettingsScreen = lazyScreen('AboutSettingsScreen', () =>
  import('../screens/settings/AboutSettingsScreen'),
)
const CreateGroupScreen = lazyScreen('CreateGroupScreen', () =>
  import('../screens/CreateGroupScreen'),
)
const CreateChannelScreen = lazyScreen('CreateChannelScreen', () =>
  import('../screens/CreateChannelScreen'),
)
const BotChatScreen = lazyScreen('BotChatScreen', () => import('../screens/BotChatScreen'))
const ConversationSettingsScreen = lazyScreen('ConversationSettingsScreen', () =>
  import('../screens/conversation/ConversationSettingsScreen'),
)
const JoinInviteScreen = lazyScreen('JoinInviteScreen', () => import('../screens/JoinInviteScreen'))

/**
 * `React.lazy` for a module that exports by name.
 *
 * Written out once so the ten routes above stay one line each. The cast is the
 * price of a dynamic `import()` whose keys TypeScript cannot narrow from a
 * string; each call site names a screen that exists, and a typo would fail at
 * the first visit rather than at build time, which is why they are listed
 * together where a mistake is visible.
 */
function lazyScreen(
  exportName: string,
  load: () => Promise<Record<string, unknown>>,
): ComponentType {
  return lazy(() =>
    load().then((module) => ({ default: module[exportName] as ComponentType })),
  )
}

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
      // Outside the shell: an invite link is followed from somewhere else, and
      // the visitor is here for one screen — the chat it opens needs no list
      // beside it. `RequireAuth` sends a stranger through sign-in first.
      { path: '/join/:token', element: lazyElement(JoinInviteScreen) },
      {
        path: ROUTES.app,
        element: <AppLayout />,
        children: [
          { index: true, element: <ChatIndexScreen /> },
          { path: '2fa', element: <TwoFactorSetupScreen /> },
          { path: CHAT_ROUTE_PATTERN, element: <ChatScreen /> },
          { path: 'chat/:id/settings', element: lazyElement(ConversationSettingsScreen) },
          {
            path: 'bot/:id',
            element: (
              <Suspense fallback={<RouteFallback />}>
                <BotChatScreen />
              </Suspense>
            ),
          },
          { path: 'settings', element: <SettingsScreen /> },
          { path: 'settings/account', element: lazyElement(AccountSettingsScreen) },
          { path: 'settings/appearance', element: lazyElement(AppearanceSettingsScreen) },
          { path: 'settings/privacy', element: lazyElement(PrivacySettingsScreen) },
          { path: 'settings/security', element: lazyElement(SecuritySettingsScreen) },
          { path: 'settings/security/2fa', element: <TwoFactorSetupScreen /> },
          { path: 'settings/notifications', element: lazyElement(NotificationsSettingsScreen) },
          { path: 'settings/accounts', element: lazyElement(AccountsSettingsScreen) },
          { path: 'settings/about', element: lazyElement(AboutSettingsScreen) },
          { path: 'profile', element: <ProfileScreen /> },
          { path: 'create-group', element: lazyElement(CreateGroupScreen) },
          { path: 'create-channel', element: lazyElement(CreateChannelScreen) },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundScreen /> },
])

/** One lazy screen, with the fallback the shell would otherwise have to know about. */
function lazyElement(Screen: ComponentType) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Screen />
    </Suspense>
  )
}
