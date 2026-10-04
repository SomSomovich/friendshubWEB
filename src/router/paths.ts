/**
 * Route paths in one place. Kept free of imports (unlike `routes.tsx`) so that
 * screens can link to each other without importing the route tree, which would
 * create a cycle.
 */
export const ROUTES = {
  landing: '/',
  login: '/login',
  register: '/register',
  twoFactor: '/2fa',
  app: '/app',
  /** Where a fresh sign-in lands while the device is prepared. */
  connect: '/connect',
  settings: '/app/settings',
  twoFactorSetup: '/app/2fa',
  createGroup: '/app/create-group',
  createChannel: '/app/create-channel',
} as const

/** Path pattern for a single conversation, for use in the route tree. */
export const CHAT_ROUTE_PATTERN = 'chat/:id'

/**
 * Login reached from inside the app, to add a second account.
 *
 * The guest guard would otherwise bounce a signed-in visitor straight back into
 * the app, so the entry point marks itself.
 */
export function addAccountPath(): string {
  return `${ROUTES.login}?add=1`
}

export function chatPath(conversationId: string): string {
  return `${ROUTES.app}/chat/${encodeURIComponent(conversationId)}`
}
