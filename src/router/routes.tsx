import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../screens/AppLayout'
import { ChatIndexScreen } from '../screens/ChatIndexScreen'
import { ChatScreen } from '../screens/ChatScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { NotFoundScreen } from '../screens/NotFoundScreen'
import { PublicLandingScreen } from '../screens/PublicLandingScreen'
import { RegisterScreen } from '../screens/RegisterScreen'
import { CHAT_ROUTE_PATTERN, ROUTES } from './paths'

/**
 * Route tree. Guards (authenticated vs. public) land in a later phase — `/app`
 * is intentionally not protected yet.
 */
export const router = createBrowserRouter([
  { path: ROUTES.landing, element: <PublicLandingScreen /> },
  { path: ROUTES.login, element: <LoginScreen /> },
  { path: ROUTES.register, element: <RegisterScreen /> },
  {
    path: ROUTES.app,
    element: <AppLayout />,
    children: [
      { index: true, element: <ChatIndexScreen /> },
      { path: CHAT_ROUTE_PATTERN, element: <ChatScreen /> },
    ],
  },
  { path: '*', element: <NotFoundScreen /> },
])
