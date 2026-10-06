import { useTranslation } from 'react-i18next'
import { RouterProvider } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastViewport } from './components/ui/ToastViewport'
import { useSessionBootstrap } from './hooks/useSessionBootstrap'
import { router } from './router/routes'

/**
 * Theme and language are owned by the UI store (`src/state/uiStore.ts`), so the
 * app needs no provider around the router. The session is restored once here,
 * before any guard has to decide whether the visitor is signed in.
 *
 * The outermost error boundary also lives here. Everything below it is inside
 * the router, where a boundary can tell which route it is on; this one cannot,
 * which is exactly why it is the last resort — if the router itself is what
 * threw, there is no screen left to fall back to and this is the message the
 * reader gets instead of a blank page.
 */
export function App() {
  useSessionBootstrap()
  const { t } = useTranslation()

  return (
    <>
      <ErrorBoundary
        scope="app"
        title={t('errors.title')}
        description={t('errors.description')}
        retryLabel={t('errors.retry')}
        reloadLabel={t('errors.reload')}
      >
        <RouterProvider router={router} />
      </ErrorBoundary>
      <ToastViewport />
    </>
  )
}
