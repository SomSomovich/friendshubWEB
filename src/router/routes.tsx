import { createBrowserRouter } from 'react-router-dom'
import { ChatIndexScreen } from '../screens/ChatIndexScreen'
import { ConnectScreen } from '../screens/ConnectScreen'
import { TwoFactorScreen } from '../screens/TwoFactorScreen'
import { TwoFactorSetupScreen } from '../screens/TwoFactorSetupScreen'
import { ChatScreen } from '../screens/ChatScreen'
import { CreateChannelScreen } from '../screens/CreateChannelScreen'
import { CreateGroupScreen } from '../screens/CreateGroupScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { NotFoundScreen } from '../screens/NotFoundScreen'
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
          { path: 'settings', element: <SettingsScreen /> },
          { path: 'create-group', element: <CreateGroupScreen /> },
          { path: 'create-channel', element: <CreateChannelScreen /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundScreen /> },
])
