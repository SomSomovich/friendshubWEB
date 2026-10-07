/**
 * A stand for the voice-message pipeline, and only for it.
 *
 * The real thing cannot be captured inside the app: an attachment is drawn from
 * bytes fetched back from the server, and the S3 bucket that holds them allows
 * the deployed origin only — a page on 127.0.0.1 cannot even PUT a chunk, so no
 * capture can get a voice message into a transcript.
 *
 * So the stand does the three things that cannot be checked any other way:
 *
 *  1. records with `MediaRecorder` and asks the real sniffer what it produced.
 *     A voice note is drawn from the mime family, and the family decides between
 *     a compact player and a `<video>` — which is a black rectangle under a
 *     native control bar, and is exactly how the "crooked" look was reported;
 *  2. asks the browser whether it can work out the length of its own recording,
 *     which is what the player's clock and its bar are drawn from;
 *  3. renders the real player in both bubbles, in both themes.
 */
import { useEffect, useMemo, useState } from 'react'
import { detectMime } from '../src/attachments/mime'
import { VoiceMessagePlayer } from '../src/components/chat/VoiceMessagePlayer'

const CLIP_SECONDS = 90
/** Where one player is parked, so the capture shows a filled bar as well. */
const SEEK_TO_SECONDS = 54

/**
 * A tone as a WAV: 8 kHz, mono, 8-bit, which every browser decodes and whose
 * header states its length exactly. A known length is the point of it — the
 * recorded clip's length is the question, not the fixture.
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

type Recording = {
  family: string
  type: string
  hex: string
  bytes: Uint8Array
}

function hexOf(bytes: Uint8Array, count: number): string {
  return [...bytes.subarray(0, count)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(' ')
}

/** Records about a second with whatever microphone the browser was given. */
async function recordClip(): Promise<Uint8Array> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  try {
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
    const chunks: Blob[] = []
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    })
    const stopped = new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => {
        resolve()
      })
    })

    recorder.start(250)
    // Four and a half seconds, so the clock reads `0:04` and not something that
    // depends on how the timing fell: a clip under a second floors to `0:00`,
    // which is a real state rather than a fault, and it would hide whether the
    // length was found at all.
    await new Promise((resolve) => setTimeout(resolve, 4_500))
    recorder.stop()
    await stopped

    return new Uint8Array(await new Blob(chunks, { type: 'audio/webm' }).arrayBuffer())
  } finally {
    for (const track of stream.getTracks()) {
      track.stop()
    }
  }
}

function VoiceStand() {
  const [wav] = useState(() => buildClip(CLIP_SECONDS))
  const [recording, setRecording] = useState<Recording | null>(null)

  useEffect(() => {
    let cancelled = false

    void recordClip()
      .then((bytes) => {
        if (cancelled) {
          return
        }
        const sniffed = detectMime(bytes)
        setRecording({ family: sniffed.family, type: sniffed.type, hex: hexOf(bytes, 176), bytes })
      })
      .catch((error: unknown) => {
        console.error('[voice stand] could not record', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // Parking a player mid-clip is the only way to see the fill: the bar is
    // drawn from the element's own position, and nothing here is really playing.
    const timer = setTimeout(() => {
      const players = document.querySelectorAll('audio')
      const last = players[players.length - 1]
      if (last !== null && last !== undefined) {
        last.currentTime = SEEK_TO_SECONDS
      }
    }, 900)
    return () => {
      clearTimeout(timer)
    }
  }, [recording])

  // Created once per recording, not once per render: a fresh object URL on every
  // render gives the element a new source, which reloads it and throws away the
  // length that was just worked out. The app has no such problem — its URL comes
  // from the attachment cache.
  const recordedUrl = useMemo(
    () =>
      recording === null
        ? null
        : URL.createObjectURL(new Blob([recording.bytes], { type: recording.type })),
    [recording],
  )

  return (
    <div className="flex min-h-dvh flex-col gap-4 bg-bg p-4 text-fg">
      {/* The verdict, in the page and therefore in the dump: `sniff=audio` is what
          keeps a voice note out of a video element. */}
      <p data-sniff className="text-xs break-all text-fg-muted">
        {recording === null ? 'sniff=recording' : `sniff=${recording.family} type=${recording.type}`}
      </p>
      {recording === null ? null : (
        // The first bytes, in the page: the track list that says whether this is
        // audio sits at 104, which is where the sniffer's old 64-byte window
        // stopped.
        <p className="text-[10px] break-all text-fg-muted">{recording.hex}</p>
      )}

      {/* The two bubbles a voice note lands in, with their real classes. The
          first player holds what the browser actually recorded; the second holds
          the WAV, whose length is exact. */}
      {recordedUrl === null ? null : (
        <div className="flex justify-end">
          <div className="rounded-2xl bg-accent/20 px-3 py-2 ring-1 ring-accent/30">
            <VoiceMessagePlayer src={recordedUrl} />
          </div>
        </div>
      )}
      <div className="flex justify-start">
        <div className="rounded-2xl bg-bg-elevated px-3 py-2">
          <VoiceMessagePlayer src={wav} />
        </div>
      </div>
    </div>
  )
}

export { VoiceStand }
