/**
 * SpeechRecognition support for an existing audio message, not for the mic.
 * Older Chromium builds expose SpeechRecognition but ignore the audio-track
 * argument to start(), which would otherwise start listening to the mic.
 */
export function supportsVoiceTranscription(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
  if (Recognition === undefined || typeof window.AudioContext !== 'function') {
    return false
  }

  const userAgent = navigator.userAgent
  // The audio-track overload is currently implemented by desktop Chromium.
  // It is not implemented by Chromium on Android, Safari, or Firefox. Avoid
  // calling start(track) on an older browser: Web IDL can ignore the argument
  // and fall back to the microphone instead.
  if (/Android/i.test(userAgent)) {
    return false
  }

  const edgeVersion = userAgent.match(/Edg\/(\d+)/)?.[1]
  const operaVersion = userAgent.match(/OPR\/(\d+)/)?.[1]
  const chromiumVersion = userAgent.match(/(?:Chrome|Chromium)\/(\d+)/)?.[1]
  const majorVersion = Number(edgeVersion ?? operaVersion ?? chromiumVersion)
  const minimumVersion = operaVersion === undefined ? 135 : 120

  return Number.isFinite(majorVersion) && majorVersion >= minimumVersion
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionForAudio

type SpeechRecognitionForAudio = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(audioTrack?: MediaStreamTrack): void
  stop(): void
  abort(): void
}

export type VoiceTranscriptionCallbacks = {
  onResult: (transcript: string) => void
  onComplete: () => void
  onError: () => void
}

/**
 * Runs one message through the browser recognizer without playing it through
 * the speakers. The live Web Audio track is passed directly to Web Speech;
 * the browser remains responsible for whether recognition is local or remote.
 */
export function startVoiceTranscription(
  src: string,
  language: string,
  callbacks: VoiceTranscriptionCallbacks,
): () => void {
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition

  if (Recognition === undefined || typeof window.AudioContext !== 'function') {
    throw new Error('Speech recognition is unavailable')
  }

  const recognition = new Recognition()
  const context = new AudioContext()
  const audio = new Audio(src)
  audio.preload = 'auto'

  let stream: MediaStream | null = null
  let transcript = ''
  let disposed = false
  let failed = false

  function dispose(abortRecognition: boolean): void {
    if (disposed) {
      return
    }
    disposed = true
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    audio.onended = null
    audio.onerror = null
    audio.pause()
    audio.removeAttribute('src')
    audio.load()

    if (abortRecognition) {
      try {
        recognition.abort()
      } catch {
        // The browser may already have ended the recognition session.
      }
    }
    stream?.getTracks().forEach((track) => track.stop())
    void context.close().catch(() => undefined)
  }

  function fail(): void {
    if (disposed) {
      return
    }
    failed = true
    callbacks.onError()
    dispose(true)
  }

  let destination: MediaStreamAudioDestinationNode
  try {
    const source = context.createMediaElementSource(audio)
    destination = context.createMediaStreamDestination()
    source.connect(destination)
    stream = destination.stream
  } catch (error) {
    audio.pause()
    void context.close().catch(() => undefined)
    throw error
  }

  recognition.lang = language
  recognition.continuous = true
  recognition.interimResults = true

  recognition.onresult = (event) => {
    transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript ?? '')
      .join('')
      .trim()
    if (transcript !== '') {
      callbacks.onResult(transcript)
    }
  }

  recognition.onerror = (event) => {
    if (event.error !== 'aborted') {
      fail()
    }
  }

  recognition.onend = () => {
    if (disposed) {
      return
    }
    dispose(false)
    if (failed) {
      return
    }
    if (transcript === '') {
      callbacks.onError()
      return
    }
    callbacks.onComplete()
  }

  audio.onended = () => {
    try {
      recognition.stop()
    } catch {
      fail()
    }
  }
  audio.onerror = fail

  try {
    const track = stream?.getAudioTracks()[0]
    if (track === undefined) {
      throw new Error('The audio track could not be created')
    }

    // Resume, begin playback, and start recognition in the same user gesture.
    // The media element is connected only to the stream destination, so the
    // voice message is not played aloud a second time.
    void context.resume().catch(fail)
    const playback = audio.play()
    recognition.start(track)
    void playback.catch(fail)
  } catch (error) {
    dispose(true)
    throw error
  }

  return () => {
    dispose(true)
  }
}
