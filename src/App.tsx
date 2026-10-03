import { RouterProvider } from 'react-router-dom'
import { router } from './router/routes'

/**
 * Theme and language are owned by the UI store (`src/state/uiStore.ts`), so the
 * app needs no provider around the router.
 */
export function App() {
  return <RouterProvider router={router} />
}
