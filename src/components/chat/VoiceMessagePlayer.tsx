import { Pause, Play } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import { formatClipDuration } from '../../utils/duration'

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

export type VoiceMessagePlayerProps = {
  /** An object URL of the decrypted file, so the duration is known at once. */
  src: string
  className?: string
}

export function VoiceMessagePlayer({ src, className }: VoiceMessagePlayerProps) {
  const { t } = useTranslation()
  const audioRef = useRef<HTMLAudioElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const [playing, setPlaying] = useState(false)
  /** 0 until the metadata arrives; a blob URL answers immediately. */
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)

  const atEnd = duration > 0 && position >= duration
  const progress = duration > 0 ? Math.min(1, position / duration) : 0
  /** While it is going, the elapsed time is the interesting one; the length when it is not. */
  const label = playing || (position > 0 && !atEnd) ? position : duration

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
          const value = event.currentTarget.duration
          // Streaming containers can report Infinity until they are played.
          setDuration(Number.isFinite(value) ? value : 0)
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

      <button
        type="button"
        aria-label={playing ? t('chat.voice.pause') : t('chat.voice.play')}
        title={playing ? t('chat.voice.pause') : t('chat.voice.play')}
        onClick={togglePlay}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-fg transition-[filter] duration-150 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
      </button>

      {/* A real slider to a screen reader, and a plain bar to look at: the
          native range input is a knob on a groove, which is a different thing
          from a progress line and cannot be talked out of it. */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={t('chat.voice.seek')}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(position)}
        aria-valuetext={formatClipDuration(position)}
        onClick={(event) => {
          seekFromPointer(event.clientX)
        }}
        onKeyDown={handleTrackKey}
        className="flex h-8 min-w-0 flex-1 cursor-pointer items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="block h-1 w-full overflow-hidden rounded-full bg-fg-muted/40">
          <span
            className="block h-full rounded-full bg-accent"
            style={{ width: `${progress * 100}%` }}
          />
        </span>
      </div>

      <span className="shrink-0 text-[11px] tabular-nums text-fg-muted">
        {formatClipDuration(label)}
      </span>
    </div>
  )
}
