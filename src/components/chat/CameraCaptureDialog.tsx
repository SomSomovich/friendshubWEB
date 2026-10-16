import { Camera, Circle, LoaderCircle, Video } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { formatClipDuration } from '../../utils/duration'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const VIDEO_HOLD_MS = 280
const MIN_VIDEO_MS = 500
const TIME_SLICE_MS = 250

export type CameraCaptureDialogProps = {
  open: boolean
  onClose: () => void
  onCapture: (file: File) => void
}

type Capture = {
  recorder: MediaRecorder
  chunks: Blob[]
  startedAt: number
  keep: boolean
  timer?: number
}

type CameraError = 'unsupported' | 'permission' | 'unavailable' | 'photo'

/** A camera surface where a tap takes a photo and a hold records a video. */
export function CameraCaptureDialog({ open, onClose, onCapture }: CameraCaptureDialogProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<MediaStream | null>(null)
  const captureRef = useRef<Capture | null>(null)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressingRef = useRef(false)
  const startingVideoRef = useRef(false)
  const suppressClickRef = useRef(false)

  const [cameraReady, setCameraReady] = useState(false)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<CameraError | null>(null)

  const stopTracks = useCallback((stream: MediaStream | null): void => {
    stream?.getTracks().forEach((track) => track.stop())
  }, [])

  const stopAudio = useCallback((): void => {
    stopTracks(audioRef.current)
    audioRef.current = null
  }, [stopTracks])

  const stopCamera = useCallback((): void => {
    stopTracks(cameraRef.current)
    cameraRef.current = null
    const video = videoRef.current
    if (video !== null) {
      video.pause()
      video.srcObject = null
    }
    setCameraReady(false)
  }, [stopTracks])

  const discardCapture = useCallback((): void => {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    pressingRef.current = false
    const capture = captureRef.current
    if (capture !== null) {
      capture.keep = false
      captureRef.current = null
      if (capture.recorder.state !== 'inactive') {
        try {
          capture.recorder.stop()
        } catch (cause) {
          console.warn('[camera] a recording could not be stopped cleanly', cause)
        }
      }
    }
    stopAudio()
    setRecording(false)
    setSeconds(0)
  }, [stopAudio])

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false
    if (navigator.mediaDevices?.getUserMedia === undefined) {
      return
    }

    void Promise.resolve()
      .then(() => {
        if (cancelled) return null
        setError(null)
        return navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
      })
      .then(async (stream) => {
        if (stream === null) return
        if (cancelled) {
          stopTracks(stream)
          return
        }
        cameraRef.current = stream
        const video = videoRef.current
        if (video === null) {
          throw new Error('preview-unavailable')
        }
        video.srcObject = stream
        await video.play()
        if (cancelled) {
          stopTracks(stream)
          video.srcObject = null
          return
        }
        setCameraReady(true)
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          const kind = cause instanceof Error ? cause.name : String(cause)
          setError(kind === 'NotAllowedError' || kind === 'SecurityError' ? 'permission' : 'unavailable')
          stopCamera()
        }
      })

    return () => {
      cancelled = true
      discardCapture()
      stopAudio()
      stopCamera()
    }
  }, [discardCapture, open, stopAudio, stopCamera, stopTracks])

  async function takePhoto(): Promise<void> {
    const video = videoRef.current
    if (video === null || video.videoWidth === 0 || video.videoHeight === 0) {
      setError('unavailable')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d', { alpha: false })
    if (context === null) {
      setError('unavailable')
      return
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    })
    if (blob === null || blob.size === 0) {
      setError('photo')
      return
    }
    onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }))
    onClose()
  }

  async function beginVideo(): Promise<void> {
    if (startingVideoRef.current || captureRef.current !== null) {
      return
    }
    if (typeof MediaRecorder === 'undefined') {
      setError('unsupported')
      return
    }
    const mimeType = cameraVideoMimeType()
    if (mimeType === null) {
      setError('unsupported')
      return
    }

    startingVideoRef.current = true
    setError(null)
    try {
      const audio = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      if (!pressingRef.current) {
        stopTracks(audio)
        return
      }
      audioRef.current = audio

      const camera = cameraRef.current
      const videoTrack = camera?.getVideoTracks()[0]
      const audioTrack = audio.getAudioTracks()[0]
      if (videoTrack === undefined || audioTrack === undefined) {
        throw new Error('media-track-unavailable')
      }

      const recorder = new MediaRecorder(new MediaStream([videoTrack, audioTrack]), { mimeType })
      const capture: Capture = { recorder, chunks: [], startedAt: Date.now(), keep: true }
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) capture.chunks.push(event.data)
      })
      recorder.addEventListener('error', (event) => {
        capture.keep = false
        setError('unavailable')
        console.warn('[camera] the recording failed', event)
      })
      recorder.addEventListener('stop', () => {
        if (capture.timer !== undefined) window.clearTimeout(capture.timer)
        if (captureRef.current === capture) {
          captureRef.current = null
        }
        stopAudio()
        setRecording(false)
        setSeconds(0)
        if (!capture.keep || capture.chunks.length === 0 || Date.now() - capture.startedAt < MIN_VIDEO_MS) {
          return
        }
        const blob = new Blob(capture.chunks, { type: recorder.mimeType || mimeType })
        const extension = blob.type.includes('mp4') ? 'mp4' : 'webm'
        onCapture(new File([blob], `camera-${Date.now()}.${extension}`, { type: blob.type }))
        onClose()
      })

      recorder.start(TIME_SLICE_MS)
      captureRef.current = capture
      setRecording(true)
      setSeconds(0)
      const tick = (): void => {
        if (captureRef.current !== capture) return
        setSeconds(Math.floor((Date.now() - capture.startedAt) / 1000))
        capture.timer = window.setTimeout(tick, 500)
      }
      tick()
    } catch (cause) {
      stopAudio()
      const kind = cause instanceof Error ? cause.name : String(cause)
      setError(kind === 'NotAllowedError' || kind === 'SecurityError' ? 'permission' : 'unavailable')
    } finally {
      startingVideoRef.current = false
    }
  }

  function stopVideo(keep: boolean): void {
    const capture = captureRef.current
    if (capture === null) {
      if (startingVideoRef.current) {
        pressingRef.current = false
      }
      return
    }
    capture.keep = keep
    if (capture.timer !== undefined) window.clearTimeout(capture.timer)
    if (capture.recorder.state !== 'inactive') capture.recorder.stop()
  }

  function startShutter(event: PointerEvent<HTMLButtonElement>): void {
    if (!cameraReady || loading || recording || event.button !== 0) return
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // A short click still takes a photo if the browser declines capture.
    }
    event.preventDefault()
    suppressClickRef.current = true
    pressingRef.current = true
    setError(null)
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null
      void beginVideo()
    }, VIDEO_HOLD_MS)
  }

  function releaseShutter(): void {
    if (!pressingRef.current) return
    pressingRef.current = false
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
      void takePhoto()
      return
    }
    stopVideo(true)
  }

  function handleShutterClick(): void {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    void takePhoto()
  }

  const loading = open && cameraReady === false && error === null && navigator.mediaDevices?.getUserMedia !== undefined
  const statusText = recording
    ? t('chat.camera.recording', { time: formatClipDuration(seconds) })
    : cameraReady
      ? t('chat.camera.hint')
      : error === 'unsupported' || navigator.mediaDevices?.getUserMedia === undefined
        ? t('chat.camera.unsupported')
        : error === 'permission'
          ? t('chat.camera.permission')
          : error === 'photo'
            ? t('chat.camera.photo')
            : loading
              ? t('chat.camera.loading')
              : t('chat.camera.unavailable')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('chat.camera.title')}
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex min-h-52 w-full items-center justify-center overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="max-h-[60vh] w-full object-contain"
          />
          {loading ? <LoaderCircle className="absolute size-8 animate-spin text-white" aria-hidden /> : null}
          {recording ? (
            <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/65 px-2.5 py-1 text-xs text-white">
              <span className="size-2 animate-pulse rounded-full bg-danger" aria-hidden />
              {formatClipDuration(seconds)}
            </span>
          ) : null}
        </div>

        <p role={error === null ? 'status' : 'alert'} className="min-h-5 text-center text-sm text-fg-muted">
          {statusText}
        </p>

        <button
          type="button"
          aria-label={recording ? t('chat.camera.stop') : t('chat.camera.capture')}
          disabled={!cameraReady || loading || navigator.mediaDevices?.getUserMedia === undefined}
          onPointerDown={startShutter}
          onPointerUp={releaseShutter}
          onPointerCancel={() => {
            suppressClickRef.current = false
            if (holdTimerRef.current !== null) {
              clearTimeout(holdTimerRef.current)
              holdTimerRef.current = null
            }
            pressingRef.current = false
            stopVideo(false)
          }}
          onClick={handleShutterClick}
          onContextMenu={(event) => event.preventDefault()}
          className="flex size-16 touch-none cursor-pointer items-center justify-center rounded-full border-4 border-fg bg-danger text-white shadow focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {recording ? <span className="size-6 rounded-md bg-white" aria-hidden /> : <Camera className="size-7" aria-hidden />}
        </button>
        <p className="flex items-center gap-1.5 text-xs text-fg-muted">
          <Circle className="size-2.5 fill-danger text-danger" aria-hidden />
          {recording ? t('chat.camera.releaseToStop') : t('chat.camera.holdForVideo')}
          {!recording ? <Video className="size-3.5" aria-hidden /> : null}
        </p>
      </div>
    </Modal>
  )
}

function cameraVideoMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null
}
