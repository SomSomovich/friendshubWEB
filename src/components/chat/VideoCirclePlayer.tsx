import { Pause, Play } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

/** Plays the square 360p WebM format used by video-circle recordings. */
export function VideoCirclePlayer({ src }: { src: string }) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  function togglePlayback(): void {
    const video = videoRef.current
    if (video === null) return
    if (video.paused) {
      void video.play().catch((cause: unknown) => {
        console.warn('[video-note] the recording could not be played', cause)
        setPlaying(false)
      })
    } else {
      video.pause()
    }
  }

  return (
    <div className="relative size-56 max-h-[72vw] max-w-[72vw] overflow-hidden rounded-full bg-black">
      <video
        ref={videoRef}
        src={src}
        playsInline
        loop
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="size-full object-cover"
      />
      <button
        type="button"
        aria-label={t(playing ? 'chat.videoNote.pause' : 'chat.videoNote.play')}
        title={t(playing ? 'chat.videoNote.pause' : 'chat.videoNote.play')}
        onClick={togglePlayback}
        className={cn(
          'absolute inset-0 flex cursor-pointer items-center justify-center text-white focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white',
          playing ? 'bg-transparent opacity-0 hover:bg-black/20 hover:opacity-100 focus-visible:bg-black/30 focus-visible:opacity-100' : 'bg-black/25',
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
          {playing ? <Pause className="size-6 fill-current" aria-hidden /> : <Play className="ml-0.5 size-6 fill-current" aria-hidden />}
        </span>
      </button>
    </div>
  )
}
