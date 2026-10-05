/*
 * Service-worker handlers the generated Workbox worker cannot express.
 *
 * `vite.config.ts` pulls this in with `workbox.importScripts`, which prepends a
 * single importScripts() call to the generated worker — the same worker, in the
 * same scope, with listeners Workbox's own configuration has no place for.
 *
 * Written as a plain classic script on purpose: the generated worker is not a
 * module, and importScripts() is only available in one.
 */

/**
 * A push is a wake-up and carries nothing else.
 *
 * The server says "there is something for you" and no more — no text, no sender,
 * no conversation — which is what keeps message content out of the push service
 * entirely. So the notification is generic by necessity rather than by choice,
 * and the app fetches the real thing over its own socket.
 *
 * One tag for all of them: a burst of wake-ups is one piece of news, and a stack
 * of identical banners is not more informative than one.
 */
self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration
      .showNotification('FriendsHub', {
        body: 'Новое сообщение',
        icon: '/pwa-icons/pwa-192x192.png',
        badge: '/pwa-icons/favicon-32x32.png',
        tag: 'friendshub-wakeup',
        renotify: true,
      })
      .catch((error) => {
        console.warn('[sw] the notification could not be shown', error)
      }),
  )
})

/**
 * Tapping a notification brings the app forward rather than opening a second
 * copy of it. An already-open tab — focused or not — is what the user means by
 * "the app"; there is no conversation to navigate to, because the push carried
 * none.
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
