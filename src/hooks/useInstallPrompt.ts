import { useCallback, useEffect, useState } from 'react'
import { readPreference, writePreference } from '../utils/browserStorage'

/**
 * The "install this as an app" affordance.
 *
 * Two quite different stories. Chrome and Android fire `beforeinstallprompt` and
 * let the page open the browser's own dialog later, when the user asks. Safari
 * fires nothing at all, so there the only honest thing is to describe the
 * gesture. A dismissal is remembered for a month in both cases — an invitation
 * that comes back on every visit is an advertisement.
 */

const DISMISS_KEY = 'fh.installDismissedAt'
const IOS_HINT_KEY = 'fh.iosInstallHintShown'
const DISMISS_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

/** Not in lib.dom: the event is Chrome's, and the spec never standardised it. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState =
  | { kind: 'hidden' }
  /** Chrome has offered a dialog we can open. */
  | { kind: 'available'; install: () => void }
  /** iOS Safari, where the gesture is the only way. */
  | { kind: 'ios' }

export function useInstallPrompt(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  // Everything except the deferred event is a fact about this render rather than
  // an event, so it is derived: an effect that mirrored it into state would be a
  // second source of the same truth.
  const offered = !dismissed && !isStandalone() && !isDismissed()
  const iosHint = offered && isIosSafari() && readPreference(IOS_HINT_KEY) === null

  useEffect(() => {
    if (!offered) {
      return
    }

    const onPromptAvailable = (event: Event): void => {
      // Chrome shows its own mini-infobar unless this is prevented, which would
      // be a second, worse version of the same offer.
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onPromptAvailable)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPromptAvailable)
    }
  }, [offered])

  const install = useCallback(() => {
    const event = deferred
    if (event === null) {
      return
    }
    setDeferred(null)
    void promptInstall(event)
    // The browser has taken over; whatever it decides, this session is done
    // asking.
    setDismissed(true)
  }, [deferred])

  if (deferred !== null) {
    return { kind: 'available', install }
  }
  if (iosHint) {
    return { kind: 'ios' }
  }
  return { kind: 'hidden' }
}

/** Records the refusal, so the offer does not return before the month is out. */
export function rememberInstallDismissal(): void {
  writePreference(DISMISS_KEY, String(Date.now()))
  writePreference(IOS_HINT_KEY, '1')
}

async function promptInstall(deferred: BeforeInstallPromptEvent): Promise<void> {
  try {
    await deferred.prompt()
    const choice = await deferred.userChoice
    if (choice.outcome === 'dismissed') {
      rememberInstallDismissal()
    }
  } catch (error) {
    console.warn('[pwa] the install prompt failed', error)
  }
}

function isDismissed(): boolean {
  const stored = readPreference(DISMISS_KEY)
  if (stored === null) {
    return false
  }
  const at = Number.parseInt(stored, 10)
  return Number.isFinite(at) && Date.now() - at < DISMISS_DAYS * DAY_MS
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

/**
 * iPhone and iPad Safari, which is the only engine that can install a web app
 * without ever firing `beforeinstallprompt`.
 *
 * The iPad reports itself as a Mac, so the touch-point count is what separates
 * it from a desktop Safari, where installing is not offered at all.
 */
function isIosSafari(): boolean {
  const ua = navigator.userAgent
  const isIos = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  return isIos && !/CriOS|FxiOS|EdgiOS/.test(ua)
}
