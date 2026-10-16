import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { markVideoCircleWebm } from '../attachments/webm'

const VIDEO_SIZE = 360
const VIDEO_FPS = 24
const TIME_SLICE_MS = 250
const MIN_DURATION_MS = 500

type FacingMode = 'user' | 'environment'
type VideoCircleError = 'unsupported' | 'permission' | 'unavailable' | 'switch'

export type VideoCircleRecording = {
  recording: boolean
  seconds: number
  switchingCamera: boolean
  error: VideoCircleError | null
  start: () => Promise<boolean>
  finish: () => Promise<Blob | null>
  cancel: () => void
  switchCamera: () => Promise<void>
}

/**
 * Records a square video note to WebM. The camera can provide any size or
 * aspect ratio; a canvas center-crops each frame to a 360×360 track so the
 * receiver can recognize this format without message-protocol metadata.
 */
export function useVideoCircleRecorder(videoRef: RefObject<HTMLVideoElement | null>): VideoCircleRecording {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [switchingCamera, setSwitchingCamera] = useState(false)
  const [error, setError] = useState<VideoCircleError | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const canvasStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startingRef = useRef(false)
  const cancelledRef = useRef(false)
  const facingModeRef = useRef<FacingMode>('user')

  const stopTracks = useCallback((stream: MediaStream | null): void => {
    stream?.getTracks().forEach((track) => track.stop())
  }, [])

  const releaseStreams = useCallback((): void => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    stopTracks(cameraStreamRef.current)
    stopTracks(audioStreamRef.current)
    stopTracks(canvasStreamRef.current)
    cameraStreamRef.current = null
    audioStreamRef.current = null
    canvasStreamRef.current = null

    const video = videoRef.current
    if (video !== null) {
      video.pause()
      video.srcObject = null
    }
  }, [stopTracks, videoRef])

  const cancel = useCallback((): void => {
    cancelledRef.current = true
    const recorder = recorderRef.current
    recorderRef.current = null
    if (recorder !== null && recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch (stopError) {
        console.warn('[video-note] the recorder could not be stopped cleanly', stopError)
      }
    }
    chunksRef.current = []
    releaseStreams()
    setRecording(false)
    setSeconds(0)
    setSwitchingCamera(false)
  }, [releaseStreams])

  const start = useCallback(async (): Promise<boolean> => {
    if (startingRef.current || recorderRef.current !== null) {
      return false
    }
    if (
      navigator.mediaDevices?.getUserMedia === undefined ||
      typeof HTMLCanvasElement.prototype.captureStream !== 'function'
    ) {
      setError('unsupported')
      return false
    }

    const mimeType = webmMimeType()
    if (mimeType === null || typeof MediaRecorder === 'undefined') {
      setError('unsupported')
      return false
    }

    startingRef.current = true
    cancelledRef.current = false
    setError(null)

    let camera: MediaStream | null = null
    let audio: MediaStream | null = null
    let canvasStream: MediaStream | null = null

    try {
      camera = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facingModeRef.current },
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
      })
      if (cancelledRef.current) {
        stopTracks(camera)
        return false
      }
      audio = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })

      if (cancelledRef.current) {
        stopTracks(camera)
        stopTracks(audio)
        return false
      }

      const video = videoRef.current
      if (video === null) {
        throw new Error('preview-unavailable')
      }
      video.srcObject = camera
      await video.play()
      await waitForVideoFrame(video)

      if (cancelledRef.current) {
        stopTracks(camera)
        stopTracks(audio)
        video.srcObject = null
        return false
      }

      cameraStreamRef.current = camera
      audioStreamRef.current = audio

      const canvas = document.createElement('canvas')
      canvas.width = VIDEO_SIZE
      canvas.height = VIDEO_SIZE
      const context = canvas.getContext('2d', { alpha: false })
      if (context === null) {
        throw new Error('canvas-unavailable')
      }

      const drawFrame = (): void => {
        const width = video.videoWidth
        const height = video.videoHeight
        if (width > 0 && height > 0) {
          const side = Math.min(width, height)
          const sourceX = (width - side) / 2
          const sourceY = (height - side) / 2
          context.drawImage(video, sourceX, sourceY, side, side, 0, 0, VIDEO_SIZE, VIDEO_SIZE)
        }
        animationFrameRef.current = requestAnimationFrame(drawFrame)
      }
      drawFrame()

      canvasStream = canvas.captureStream(VIDEO_FPS)
      const audioTrack = audio.getAudioTracks()[0]
      const videoTrack = canvasStream.getVideoTracks()[0]
      if (audioTrack === undefined || videoTrack === undefined) {
        throw new Error('media-track-unavailable')
      }

      const recordingStream = new MediaStream([videoTrack, audioTrack])
      const recorder = new MediaRecorder(recordingStream, {
        mimeType,
        videoBitsPerSecond: 500_000,
        audioBitsPerSecond: 64_000,
      })
      const recordingChunks: Blob[] = []
      recorder.addEventListener('dataavailable', (event) => {
        if (!cancelledRef.current && event.data.size > 0) {
          recordingChunks.push(event.data)
        }
      })
      recorder.addEventListener('error', (event) => {
        if (!cancelledRef.current) {
          console.warn('[video-note] the recorder reported an error', event)
          setError('unavailable')
        }
      })

      recorder.start(TIME_SLICE_MS)
      cameraStreamRef.current = camera
      audioStreamRef.current = audio
      canvasStreamRef.current = canvasStream
      chunksRef.current = recordingChunks
      recorderRef.current = recorder
      startedAtRef.current = Date.now()
      setSeconds(0)
      setRecording(true)

      timerRef.current = setInterval(() => {
        setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }, 500)
      return true
    } catch (cause) {
      stopTracks(camera)
      stopTracks(audio)
      stopTracks(canvasStream)
      if (videoRef.current !== null) {
        videoRef.current.srcObject = null
      }
      releaseStreams()
      const kind = cause instanceof Error ? cause.name : String(cause)
      console.warn('[video-note] camera recording could not start', cause)
      setError(kind === 'NotAllowedError' || kind === 'SecurityError' ? 'permission' : 'unavailable')
      setRecording(false)
      return false
    } finally {
      startingRef.current = false
    }
  }, [releaseStreams, stopTracks, videoRef])

  const finish = useCallback(async (): Promise<Blob | null> => {
    const recorder = recorderRef.current
    if (recorder === null || recorder.state === 'inactive') {
      return null
    }

    const durationMs = Date.now() - startedAtRef.current
    const stopped = new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true })
    })
    recorder.stop()
    await stopped

    const chunks = chunksRef.current
    const mimeType = recorder.mimeType || 'video/webm'
    recorderRef.current = null
    cancelledRef.current = false
    chunksRef.current = []
    releaseStreams()
    setRecording(false)
    setSeconds(0)

    if (durationMs < MIN_DURATION_MS || chunks.length === 0) {
      return null
    }
    try {
      return await markVideoCircleWebm(new Blob(chunks, { type: mimeType }))
    } catch (cause) {
      console.warn('[video-note] the WebM circle marker could not be written', cause)
      setError('unavailable')
      return null
    }
  }, [releaseStreams])

  const switchCamera = useCallback(async (): Promise<void> => {
    const current = cameraStreamRef.current
    const currentTrack = current?.getVideoTracks()[0]
    if (current === null || current === undefined || currentTrack === undefined || switchingCamera) {
      return
    }

    const previousFacing = facingModeRef.current
    const nextFacing: FacingMode = previousFacing === 'user' ? 'environment' : 'user'
    setSwitchingCamera(true)
    setError(null)

    try {
      await currentTrack.applyConstraints({ facingMode: { exact: nextFacing } })
      facingModeRef.current = nextFacing
    } catch {
      // Some mobile browsers cannot switch an active track in place. The
      // canvas track being recorded stays alive while the camera source swaps.
      stopTracks(current)
      cameraStreamRef.current = null
      const video = videoRef.current
      if (video !== null) {
        video.pause()
        video.srcObject = null
      }
      try {
        const next = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { exact: nextFacing },
            width: { ideal: 720 },
            height: { ideal: 720 },
          },
        })
        cameraStreamRef.current = next
        if (video !== null) {
          video.srcObject = next
          await video.play()
          await waitForVideoFrame(video)
        }
        facingModeRef.current = nextFacing
      } catch (switchError) {
        setError('switch')
        try {
          const restored = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: previousFacing },
              width: { ideal: 720 },
              height: { ideal: 720 },
            },
          })
          cameraStreamRef.current = restored
          if (video !== null) {
            video.srcObject = restored
            await video.play()
          }
        } catch (restoreError) {
          console.warn('[video-note] previous camera could not be restored', restoreError)
          cancel()
        }
        console.warn('[video-note] camera could not be switched', switchError)
      }
    } finally {
      setSwitchingCamera(false)
    }
  }, [cancel, stopTracks, switchingCamera, videoRef])

  useEffect(() => cancel, [cancel])

  return { recording, seconds, switchingCamera, error, start, finish, cancel, switchCamera }
}

function webmMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') {
    return null
  }
  const candidates = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null
}

function waitForVideoFrame(video: HTMLVideoElement): Promise<void> {
  if (video.videoWidth > 0 && video.videoHeight > 0) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('camera-frame-timeout'))
    }, 5000)

    function ready(): void {
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        return
      }
      cleanup()
      resolve()
    }

    function failed(): void {
      cleanup()
      reject(new Error('camera-frame-failed'))
    }

    function cleanup(): void {
      window.clearTimeout(timeout)
      video.removeEventListener('loadedmetadata', ready)
      video.removeEventListener('loadeddata', ready)
      video.removeEventListener('error', failed)
    }

    video.addEventListener('loadedmetadata', ready)
    video.addEventListener('loadeddata', ready)
    video.addEventListener('error', failed)
  })
}
