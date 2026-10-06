import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '../components/ui/Spinner'
import { useUiStore } from '../state/uiStore'
import { ROUTES, isAddingAccount } from './paths'

/**
 * Route guards.
 *
 * Both wait for the session bootstrap: deciding before the accounts are read
 * would bounce a signed-in visitor to the login screen on every reload, which is
 * the classic bug this flag exists to prevent.
 */

function SessionPending() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Spinner className="size-6 text-fg-muted" />
    </div>
  )
}

/** Everything below this route needs a signed-in account. */
export function RequireAuth() {
  const sessionReady = useUiStore((state) => state.sessionReady)
  const activeAccountId = useUiStore((state) => state.activeAccountId)
  const location = useLocation()

  if (!sessionReady) {
    return <SessionPending />
  }
  if (activeAccountId === null) {
    // `from` lets the login screen return the visitor where they were headed.
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/**
 * Login, registration and 2FA — for visitors who are not signed in yet.
 *
 * Adding a second account happens from inside the app, where the visitor is
 * already signed in, so `?add=1` is the one way past this guard; without it the
 * guard would bounce them straight back into the app.
 */
export function RequireGuest() {
  const sessionReady = useUiStore((state) => state.sessionReady)
  const activeAccountId = useUiStore((state) => state.activeAccountId)
  const location = useLocation()

  if (!sessionReady) {
    return <SessionPending />
  }

  if (activeAccountId !== null && !isAddingAccount(location.search)) {
    return <Navigate to={ROUTES.app} replace />
  }
  return <Outlet />
}
