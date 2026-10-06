/**
 * The incoming-call ringtone, synthesised rather than bundled.
 *
 * An audio file would be one more asset to ship, cache and license, and the tone
 * is two sine bursts — Web Audio makes it in a few lines and gives an exact
 * `stop()` with no decode step and no playback that can outlive the call.
 *
 * Browsers refuse to *start* an `AudioContext` before the user has interacted
 * with the page, and an incoming call arrives with no gesture behind it. The
 * context is resumed optimistically and the failure is swallowed: a silent ring
 * still leaves the overlay, the notification and the vibration of the device
 * itself, which is why this is not treated as an error.
 */

/** One "ring" every two seconds, audible for the first 400 ms of it. */
const RING_INTERVAL_MS = 2_000
const TONE_MS = 400
const TONE_HZ = 480
const PEAK_GAIN = 0.12

export type Ringtone = {
  stop: () => void
}

/** Used when the browser has no Web Audio at all; the call still rings visually. */
const SILENT: Ringtone = { stop: () => {} }

export function startRingtone(): Ringtone {
  let context: AudioContext
  try {
    context = new AudioContext()
  } catch (error) {
    console.warn('[calls] the ringtone could not be started', error)
    return SILENT
  }

  // Almost always rejected on an incoming call (no gesture yet); the ring is
  // simply silent until the next user interaction, and everything else about the
  // overlay still works.
  void context.resume().catch(() => {})

  const gain = context.createGain()
  gain.gain.value = 0
  gain.connect(context.destination)

  const oscillator = context.createOscillator()
  oscillator.type = 'sine'
  oscillator.frequency.value = TONE_HZ
  oscillator.connect(gain)
  oscillator.start()

  const ring = (): void => {
    const now = context.currentTime
    // Ramped rather than switched: a square edge on a sine is an audible click.
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, now + 0.03)
    gain.gain.setValueAtTime(PEAK_GAIN, now + TONE_MS / 1_000)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + TONE_MS / 1_000 + 0.05)
  }

  ring()
  const timer = setInterval(ring, RING_INTERVAL_MS)

  let stopped = false
  return {
    stop: () => {
      if (stopped) {
        return
      }
      stopped = true
      clearInterval(timer)
      try {
        oscillator.stop()
        oscillator.disconnect()
        gain.disconnect()
      } catch {
        // Already torn down by the browser (a suspended context, a page unload).
      }
      void context.close().catch(() => {})
    },
  }
}
