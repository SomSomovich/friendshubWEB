/**
 * A stand for the voice-message player, and only for it.
 *
 * The real thing cannot be captured in the app: an attachment is rendered from
 * bytes fetched back from the server, and the S3 bucket that holds them allows
 * the deployed origin only — a page on 127.0.0.1 cannot even PUT a chunk, so no
 * capture can get a voice message into a transcript. What can be captured is the
 * component, wrapped in the two bubbles it appears in, with a clip built here.
 *
 * The clip is a real WAV rather than a fixture: the player reads its length and
 * the width of its bar out of the file, and a file that will not decode would
 * draw an empty bar and prove nothing.
 */
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { VoiceMessagePlayer } from '../src/components/chat/VoiceMessagePlayer'
// Side-effect import: configures i18next from the stored preference, so the
// stand speaks whichever language the capture asked for.
import '../src/i18n/index'
import '../src/index.css'
import { applyTheme, isTheme, THEME_STORAGE_KEY } from '../src/theme/theme'
import { readPreference } from '../src/utils/browserStorage'

// In the app the theme is on `<html>` before the first paint, put there by the
// bootstrap script in `index.html`. This stand has no such script, so it reads
// the stored preference itself — `readActiveTheme` would only ever find the
// default here, and the light capture came out dark because of it.
const storedTheme = readPreference(THEME_STORAGE_KEY)
applyTheme(isTheme(storedTheme) ? storedTheme : 'dark')

const CLIP_SECONDS = 90
/** Where the second player is parked, so the capture shows a filled bar too. */
const SEEK_TO_SECONDS = 54

/**
 * A tone as a WAV: 8 kHz, mono, 8-bit, which every browser decodes and whose
 * header states its length exactly, so the player has a duration the moment the
 * metadata lands rather than after a play.
 */
function buildClip(seconds: number): string {
  const rate = 8_000
  const samples = rate * seconds
  const buffer = new ArrayBuffer(44 + samples)
  const view = new DataView(buffer)

  const ascii = (offset: number, text: string): void => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index))
    }
  }
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + samples, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, rate, true)
  view.setUint32(28, rate, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  ascii(36, 'data')
  view.setUint32(40, samples, true)

  // Eight-bit PCM is unsigned, so silence sits at 128. A quiet tone rather than
  // silence keeps the file from being a special case for the decoder.
  const bytes = new Uint8Array(buffer, 44)
  for (let index = 0; index < samples; index += 1) {
    bytes[index] = 128 + Math.round(20 * Math.sin((2 * Math.PI * 440 * index) / rate))
  }

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}

function VoiceStand() {
  const [src] = useState(() => buildClip(CLIP_SECONDS))

  useEffect(() => {
    // Parking one player mid-clip is the only way to see the fill: the bar is
    // drawn from the element's own position, and nothing here is really playing.
    const timer = setTimeout(() => {
      const second = document.querySelectorAll('audio')[1]
      if (second !== null && second !== undefined) {
        second.currentTime = SEEK_TO_SECONDS
      }
    }, 300)
    return () => {
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="flex min-h-dvh flex-col gap-4 bg-bg p-4 text-fg">
      {/* The two bubbles a voice note lands in, with their real classes: this is
          the part that was wrong — the browser's own widget is wider than the
          bubble and ignores both themes. */}
      <div className="flex justify-end">
        <div className="rounded-2xl bg-accent/20 px-3 py-2 ring-1 ring-accent/30">
          <VoiceMessagePlayer src={src} />
        </div>
      </div>
      <div className="flex justify-start">
        <div className="rounded-2xl bg-bg-elevated px-3 py-2">
          <VoiceMessagePlayer src={src} />
        </div>
      </div>
    </div>
  )
}

const container = document.getElementById('root')

if (!container) {
  throw new Error('Missing #root element in voice.html')
}

createRoot(container).render(<VoiceStand />)
