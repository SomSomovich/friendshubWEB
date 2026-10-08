import { Pause, Play, TriangleAlert } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import { formatClipDuration } from '../../utils/duration'
import { UploadProgressRing } from './UploadProgressRing'

/**
 * A voice message, played by the app rather than by the browser.
 *
 * `<audio controls>` was the obvious thing and the wrong one: its widget is a
 * light-themed panel with a size of its own, so inside a message bubble it
 * ignored the theme and spilled over the bubble's rounded corner. Three things
 * are what a voice note actually needs — play or pause, where it has got to, and
 * how long it is — and drawing those is less work than taming the widget was.
 *
 * The element itself stays, hidden: decoding, buffering and seeking are the
 * browser's job, and re-implementing them over Web Audio would be a project.
 */

/** How far the arrow keys move the position, matching every other player. */
const SEEK_STEP_SECONDS = 5

export type VoiceUploadState = {
  /** 0..1 while the file is on its way to the server. */
  progress: number
  /** A sentence once the upload has given up; `null` while it is still trying. */
  error: string | null
}

export type VoiceMessagePlayerProps = {
  /** An object URL of the file — decrypted, or still being uploaded. */
  src: string
  /**
   * Present while the recording has not reached the server yet.
   *
   * A voice note is a local file first, and until it is uploaded the play
   * control is replaced by how far it has got. Without that, releasing the
   * microphone looked like nothing happening at all — which is what was
   * reported.
   */
  upload?: VoiceUploadState
  className?: string
}

export function VoiceMessagePlayer({ src, upload, className }: VoiceMessagePlayerProps) {
  const { t } = useTranslation()
  const audioRef = useRef<HTMLAudioElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  /** On its way to the server: no play control, and nothing to seek yet. */
  const sending = upload !== undefined && upload.error === null
  const failed = upload !== undefined && upload.error !== null

  const [playing, setPlaying] = useState(false)
  /** 0 until the metadata arrives; a blob URL answers immediately. */
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)

  const atEnd = duration > 0 && position >= duration
  const progress = duration > 0 ? Math.min(1, position / duration) : 0
  /** While it is going, the elapsed time is the interesting one; the length when it is not. */
  const label = playing || (position > 0 && !atEnd) ? position : duration

  /**
   * Makes the element work out how long the clip is.
   *
   * `MediaRecorder` writes a WebM whose header carries no length, so the element
   * reports `NaN` and there is nothing to draw a bar against: every voice note
   * shows `0:00` with a dead scrubber, which is half of what a voice note is.
   * Seeking past the end forces it to scan the file, and the real length arrives
   * with `durationchange` — after which the position is put back.
   */
  function probeDuration(audio: HTMLAudioElement): void {
    const settle = (): void => {
      if (!Number.isFinite(audio.duration)) {
        return
      }
      audio.removeEventListener('durationchange', settle)
      audio.removeEventListener('timeupdate', settle)
      audio.currentTime = 0
      setDuration(audio.duration)
    }

    audio.addEventListener('durationchange', settle)
    audio.addEventListener('timeupdate', settle)
    try {
      audio.currentTime = Number.MAX_SAFE_INTEGER
    } catch (error) {
      // A file the element refuses to seek has no length to find.
      console.warn('[voice] the recording length could not be worked out', error)
    }
  }

  function togglePlay(): void {
    const audio = audioRef.current
    if (audio === null) {
      return
    }

    if (!audio.paused) {
      audio.pause()
      return
    }

    // A finished clip starts again rather than sitting at its end doing nothing.
    if (atEnd) {
      audio.currentTime = 0
    }
    // The press is the gesture the autoplay policy wants, so a rejection here
    // means the file itself will not decode.
    void audio.play().catch((error: unknown) => {
      console.warn('[voice] the recording could not be played', error)
    })
  }

  function seekTo(seconds: number): void {
    const audio = audioRef.current
    if (audio === null || !Number.isFinite(duration) || duration <= 0) {
      return
    }
    const clamped = Math.min(Math.max(seconds, 0), duration)
    audio.currentTime = clamped
    setPosition(clamped)
  }

  function seekFromPointer(clientX: number): void {
    const track = trackRef.current
    if (track === null) {
      return
    }
    const rect = track.getBoundingClientRect()
    if (rect.width === 0) {
      return
    }
    seekTo(((clientX - rect.left) / rect.width) * duration)
  }

  function handleTrackKey(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      seekTo(position - SEEK_STEP_SECONDS)
      return
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      seekTo(position + SEEK_STEP_SECONDS)
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      seekTo(0)
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      seekTo(duration)
    }
  }

  return (
    <div className={cn('flex w-56 max-w-full items-center gap-2', className)}>
      <audio
        ref={audioRef}
        src={src}
        // The file is already here as a blob, so this costs nothing and gets the
        // duration before anything is pressed.
        preload="metadata"
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget
          if (Number.isFinite(audio.duration)) {
            setDuration(audio.duration)
            return
          }
          probeDuration(audio)
        }}
        onTimeUpdate={(event) => {
          setPosition(event.currentTarget.currentTime)
        }}
        onPlay={() => {
          setPlaying(true)
        }}
        onPause={() => {
          setPlaying(false)
        }}
        onEnded={() => {
          setPlaying(false)
        }}
        className="hidden"
      />

      {/* The same disc as the play button, holding what is happening instead of
          what can be done: how far the upload has got, or that it stopped. */}
      {sending ? (
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg"
        >
          <UploadProgressRing progress={upload.progress} label={t('chat.voice.uploading')} />
        </span>
      ) : failed ? (
        <span
          role="img"
          aria-label={upload.error ?? t('chat.voice.failed')}
          title={upload.error ?? t('chat.voice.failed')}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-danger text-danger-fg"
        >
          <TriangleAlert className="size-4" aria-hidden />
        </span>
      ) : (
        <button
          type="button"
          aria-label={playing ? t('chat.voice.pause') : t('chat.voice.play')}
          title={playing ? t('chat.voice.pause') : t('chat.voice.play')}
          onClick={togglePlay}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-fg transition-[filter] duration-150 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
        </button>
      )}

      {/* A real slider to a screen reader, and a plain bar to look at: the
          native range input is a knob on a groove, which is a different thing
          from a progress line and cannot be talked out of it. It is inert until
          the recording has a copy on the server worth seeking in. */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={sending || failed ? -1 : 0}
        aria-label={t('chat.voice.seek')}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(position)}
        aria-valuetext={formatClipDuration(position)}
        aria-disabled={sending || failed}
        onClick={(event) => {
          if (!sending && !failed) {
            seekFromPointer(event.clientX)
          }
        }}
        onKeyDown={(event) => {
          if (!sending && !failed) {
            handleTrackKey(event)
          }
        }}
        className={cn(
          'flex h-8 min-w-0 flex-1 items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          sending || failed ? 'cursor-default' : 'cursor-pointer',
        )}
      >
        <span className="block h-1 w-full overflow-hidden rounded-full bg-fg-muted/40">
          <span
            className={cn('block h-full rounded-full', failed ? 'bg-danger' : 'bg-accent')}
            style={{ width: `${progress * 100}%` }}
          />
        </span>
      </div>

      {/* The length, until there is something more important to say about it. */}
      <span
        className={cn(
          'shrink-0 text-[11px] tabular-nums',
          failed ? 'font-medium text-danger' : 'text-fg-muted',
        )}
      >
        {failed ? t('chat.voice.failed') : formatClipDuration(label)}
      </span>
    </div>
  )
}
