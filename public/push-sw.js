/*
 * Service-worker handlers the generated Workbox worker cannot express.
 *
 * `vite.config.ts` pulls this in with `workbox.importScripts`, which prepends a
 * single importScripts() call to the generated worker — the same worker, in the
 * same scope, with a listener Workbox's own configuration has no place for.
 *
 * Written as a plain classic script on purpose: the generated worker is not a
 * module, and importScripts() is only available in one.
 */

/**
 * Tapping a notification should bring the app forward rather than open a second
 * copy of it. An already-open tab — in either layout, focused or not — is what
 * the user means by "the app".
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.focus()
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/app')
        }
        return undefined
      })
      .catch((error) => {
        console.warn('[sw] could not focus a window for the notification', error)
      }),
  )
})
