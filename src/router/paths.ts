/**
 * Route paths in one place. Kept free of imports (unlike `routes.tsx`) so that
 * screens can link to each other without importing the route tree, which would
 * create a cycle.
 */
export const ROUTES = {
  landing: '/',
  login: '/login',
  register: '/register',
  app: '/app',
} as const

/** Path pattern for a single conversation, for use in the route tree. */
export const CHAT_ROUTE_PATTERN = 'chat/:id'
