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
  profile: '/app/profile',
} as const

/**
 * One route per settings section rather than a single screen with tabs: below
 * `md` there is no room for a sidebar of sections, and a push navigation is what
 * a phone expects. The list on `/app/settings` is the index of these.
 */
export const SETTINGS_SECTIONS = [
  'account',
  'appearance',
  'privacy',
  'security',
  'notifications',
  'accounts',
  'about',
] as const

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]

export function settingsPath(section: SettingsSection): string {
  return `${ROUTES.settings}/${section}`
}

/** Path pattern for a single conversation, for use in the route tree. */
export const CHAT_ROUTE_PATTERN = 'chat/:id'

/**
 * The query flag that lets a signed-in visitor reach the sign-in screens.
 *
 * The guest guard turns a signed-in visitor away from every one of them, so
 * adding a second account has to announce itself — and the announcement has to
 * survive every hop of the flow: login, registration, 2FA, and back again.
 *
 * A link that forgets it does not fail loudly. It silently drops the visitor on
 * the conversation list, which is exactly what the "create an account" link on
 * the sign-in screen used to do.
 */
export const ADD_ACCOUNT_PARAM = 'add'

/** Whether `search` — a `location.search` string — says an account is being added. */
export function isAddingAccount(search: string): boolean {
  return new URLSearchParams(search).get(ADD_ACCOUNT_PARAM) === '1'
}

/**
 * Carries that flag from one guest screen to the next.
 *
 * Every `to` and every `navigate` inside the sign-in flow goes through here, so
 * the parameter is spelled out in exactly one place and a new link cannot forget
 * it by being written the obvious way.
 */
export function withAddAccount(to: string, search: string): string {
  return isAddingAccount(search) ? `${to}?${ADD_ACCOUNT_PARAM}=1` : to
}

/** Login reached from inside the app, to add a second account. */
export function addAccountPath(): string {
  return withAddAccount(ROUTES.login, `?${ADD_ACCOUNT_PARAM}=1`)
}

export function botPath(botId: string): string {
  return `${ROUTES.app}/bot/${encodeURIComponent(botId)}`
}

export function chatPath(conversationId: string): string {
  return `${ROUTES.app}/chat/${encodeURIComponent(conversationId)}`
}

/**
 * A group's or a channel's management screen.
 *
 * Under the conversation rather than under `/app/settings`: it is that chat's
 * settings, it is the chat that the back button must return to, and the two
 * must not be able to disagree about which one is open.
 */
export function conversationSettingsPath(conversationId: string): string {
  return `${chatPath(conversationId)}/settings`
}

/** Path pattern for an invite link, for use in the route tree. */
export const JOIN_ROUTE_PATTERN = 'join/:token'

/** Where an invite link points. Not under `/app`: it is a link, not a screen. */
export function joinPath(token: string): string {
  return `/join/${encodeURIComponent(token)}`
}

/**
 * Where the sign-in flow should land once it is done.
 *
 * Carried in the router state by `RequireAuth`, which knows the screen a visitor
 * was turned away from. Only a path is accepted — never a full URL — so a
 * tampered state cannot turn the end of a login into a redirect somewhere else.
 */
export type AuthRedirectState = { from?: string } | null

export function redirectTarget(state: unknown, fallback: string): string {
  const from = (state as AuthRedirectState)?.from
  return typeof from === 'string' && from.startsWith('/') ? from : fallback
}
