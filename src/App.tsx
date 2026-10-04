import { RouterProvider } from 'react-router-dom'
import { ToastViewport } from './components/ui/ToastViewport'
import { useSessionBootstrap } from './hooks/useSessionBootstrap'
import { router } from './router/routes'

/**
 * Theme and language are owned by the UI store (`src/state/uiStore.ts`), so the
 * app needs no provider around the router. The session is restored once here,
 * before any guard has to decide whether the visitor is signed in.
 */
export function App() {
  useSessionBootstrap()

  return (
    <>
      <RouterProvider router={router} />
      <ToastViewport />
    </>
  )
}
