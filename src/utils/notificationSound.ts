/**
 * The notification sounds, synthesised rather than shipped.
 *
 * Three short tones are not worth three audio files and a fetch on the critical
 * path: an oscillator and a gain envelope produce them in a few lines, and there
 * is nothing to decode, cache or precache.
 */

export const NOTIFICATION_SOUNDS = ['chime', 'ping', 'pop', 'none'] as const

export type NotificationSound = (typeof NOTIFICATION_SOUNDS)[number]

export function isNotificationSound(value: unknown): value is NotificationSound {
  return typeof value === 'string' && (NOTIFICATION_SOUNDS as readonly string[]).includes(value)
}

type Note = {
  frequency: number
  /** Seconds from the start of the sound. */
  at: number
  duration: number
  type: OscillatorType
}

/**
 * Two ascending notes, read as "a message arrived" rather than as an alarm —
 * the same shape most messengers use.
 */
const RECIPES: Record<Exclude<NotificationSound, 'none'>, readonly Note[]> = {
  chime: [
    { frequency: 1_318.5, at: 0, duration: 0.12, type: 'sine' },
    { frequency: 1_760, at: 0.09, duration: 0.18, type: 'sine' },
  ],
  ping: [{ frequency: 880, at: 0, duration: 0.16, type: 'sine' }],
  pop: [{ frequency: 420, at: 0, duration: 0.08, type: 'triangle' }],
}

const PEAK_GAIN = 0.15

/**
 * Plays one sound. A no-op for `none`, and silent rather than throwing when the
 * browser refuses to start an audio context — a missing blip must never break
 * the thing it was announcing.
 */
export function playNotificationSound(sound: NotificationSound): void {
  if (sound === 'none') {
    return
  }

  const Context = window.AudioContext
  if (Context === undefined) {
    return
  }

  try {
    const context = new Context()
    const start = context.currentTime

    for (const note of RECIPES[sound]) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.type = note.type
      oscillator.frequency.value = note.frequency

      const noteStart = start + note.at
      const noteEnd = noteStart + note.duration
      // A ramp rather than a switch: an abrupt stop clicks, and the click is
      // louder than the tone.
      gain.gain.setValueAtTime(0, noteStart)
      gain.gain.linearRampToValueAtTime(PEAK_GAIN, noteStart + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd)

      oscillator.connect(gain).connect(context.destination)
      oscillator.start(noteStart)
      oscillator.stop(noteEnd + 0.02)
    }

    const total = Math.max(...RECIPES[sound].map((note) => note.at + note.duration))
    window.setTimeout(() => {
      void context.close().catch(() => undefined)
    }, (total + 0.2) * 1000)
  } catch (error) {
    console.warn('[notifications] the sound could not be played', error)
  }
}
