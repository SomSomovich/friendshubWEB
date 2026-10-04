import { Outlet, useMatch } from 'react-router-dom'
import { AppSidebar } from '../components/layout/AppSidebar'
import { UserProfileModal } from '../components/profile/UserProfileModal'
import { InstallBanner } from '../components/pwa/InstallBanner'
import { OfflineBanner } from '../components/pwa/OfflineBanner'
import { PushPrompt } from '../components/pwa/PushPrompt'
import { useAccountConnection } from '../hooks/useAccountConnection'
import { ROUTES } from '../router/paths'
import { cn } from '../utils/cn'

/**
 * The shell: a conversation list beside the open conversation.
 *
 * The two panels are switched with CSS rather than a layout state, so both
 * survive a resize. Below `md` only one is visible: the list on `/app` itself,
 * and the routed screen everywhere else (a conversation, settings, a creation
 * flow) — each of which offers its own way back. From `md` up both are shown and
 * the routed screen owns the remaining width.
 *
 * The shell is also what owns the live connection, because every screen below it
 * assumes messages keep arriving while the user is somewhere else in the app.
 */
export function AppLayout() {
  const onIndex = useMatch({ path: ROUTES.app, end: true }) !== null
  useAccountConnection()

  return (
    <div className="app-viewport flex min-h-0 flex-col bg-bg text-fg">
      {/* The two notices belong to the shell rather than to a screen: they are
          about the app itself, and both would otherwise be repeated in every
          screen that could be showing when the network drops. */}
      <OfflineBanner />

      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            'w-full min-w-0 flex-col md:flex md:w-80 md:shrink-0',
            onIndex ? 'flex' : 'hidden',
          )}
        >
          <AppSidebar />
        </div>

        <main className={cn('min-w-0 flex-1 flex-col md:flex', onIndex ? 'hidden' : 'flex')}>
          <Outlet />
        </main>
      </div>

      <InstallBanner />

      {/* One dialog for every avatar in the app; see the component's note. */}
      <UserProfileModal />
      <PushPrompt />
    </div>
  )
}
