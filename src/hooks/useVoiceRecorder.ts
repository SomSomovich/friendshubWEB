import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Recording a voice message.
 *
 * The microphone is opened on the press and closed on the release, because a
 * browser shows its recording indicator for as long as a stream is live and a
 * permanently open microphone is a thing users notice.
 *
 * The container is whatever the browser will actually record — Opus in WebM,
 * Opus in Ogg, or AAC in an MP4 — since there is no way to ask for one that is
 * not supported. Which it turned out to be is read back off the blob.
 */

/** Below this there is nothing to send, and it is almost always a mis-tap. */
const MIN_DURATION_MS = 500
const TIME_SLICE_MS = 250

export type VoiceRecording = {
  recording: boolean
  /** Whole seconds since the press, for the timer next to the microphone. */
  seconds: number
  start: () => Promise<void>
  /** Stops and discards. Nothing is returned, and no blob leaves the recorder. */
  cancel: () => void
  /** Stops and returns what was recorded, or `null` if there is nothing usable. */
  finish: () => Promise<Blob | null>
}

export function useVoiceRecorder(): VoiceRecording {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const cancelledRef = useRef(false)

  const release = useCallback(() => {
    const recorder = recorderRef.current
    recorderRef.current = null
    setRecording(false)
    setSeconds(0)

    if (recorder === null) {
      return
    }
    recorder.stream.getTracks().forEach((track) => {
      track.stop()
    })
  }, [])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    const recorder = recorderRef.current
    if (recorder !== null && recorder.state !== 'inactive') {
      recorder.stop()
    }
    release()
  }, [release])

  const start = useCallback(async () => {
    if (recorderRef.current !== null) {
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = preferredMimeType()
      const recorder = new MediaRecorder(stream, mimeType === null ? undefined : { mimeType })

      chunksRef.current = []
      cancelledRef.current = false
      startedAtRef.current = Date.now()

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      })

      recorder.start(TIME_SLICE_MS)
      recorderRef.current = recorder
      setRecording(true)
    } catch (error) {
      console.warn('[voice] the microphone could not be opened', error)
      release()
    }
  }, [release])

  const finish = useCallback(async (): Promise<Blob | null> => {
    const recorder = recorderRef.current
    if (recorder === null) {
      return null
    }

    const tooShort = Date.now() - startedAtRef.current < MIN_DURATION_MS
    const stopped = new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => {
        resolve()
      })
    })

    recorder.stop()
    await stopped
    const chunks = chunksRef.current
    release()

    if (tooShort || cancelledRef.current || chunks.length === 0) {
      return null
    }
    return new Blob(chunks, { type: recorder.mimeType })
  }, [release])

  // The timer is what makes a press feel like it is doing something; the
  // recorder itself does not report progress.
  useEffect(() => {
    if (!recording) {
      return
    }
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 500)
    return () => {
      clearInterval(timer)
    }
  }, [recording])

  // Leaving the screen mid-recording must not leave the microphone on.
  useEffect(() => cancel, [cancel])

  return { recording, seconds, start, cancel, finish }
}

/** The first container this browser admits to supporting. */
function preferredMimeType(): string | null {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null
}
