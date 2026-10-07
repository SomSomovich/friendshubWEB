import { Download, FileText, Loader2, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { displayName, formatBytes } from '../../attachments/display'
import type { AttachmentMime } from '../../attachments/mime'
import { useAttachment } from '../../hooks/useAttachment'
import { VoiceMessagePlayer } from './VoiceMessagePlayer'

export type AttachmentViewProps = {
  accountId: string
  attachmentId: string
  onOpen: (url: string, mime: AttachmentMime) => void
}

/**
 * One attachment inside a message.
 *
 * Which of four things to draw comes from the bytes rather than from the
 * message, because the protocol carries no content type — see
 * `src/attachments/mime.ts`. Nothing is downloaded until this mounts, and a
 * thumbnail that has not arrived shows its own placeholder rather than holding
 * up the message around it.
 */
export function AttachmentView({ accountId, attachmentId, onOpen }: AttachmentViewProps) {
  const { t } = useTranslation()
  const state = useAttachment(accountId, attachmentId)

  if (state.status === 'loading') {
    return (
      <div className="flex h-32 w-48 items-center justify-center rounded-lg bg-bg-hover">
        <Loader2 className="size-5 animate-spin text-fg-muted" aria-hidden />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex h-20 w-48 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-bg px-2 text-center">
        <TriangleAlert className="size-4 text-fg-muted" aria-hidden />
        <span className="text-[11px] text-fg-muted">
          {state.message === 'no-key' ? t('chat.attach.waitingKey') : t('chat.attach.unavailable')}
        </span>
      </div>
    )
  }

  const { url, mime, size, fileName } = state

  if (mime.family === 'image') {
    return (
      <button
        type="button"
        onClick={() => {
          onOpen(url, mime)
        }}
        className="block cursor-pointer overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <img
          src={url}
          alt={fileName ?? t('chat.attach.photo')}
          className="max-h-72 max-w-full object-cover"
        />
      </button>
    )
  }

  if (mime.family === 'video') {
    return (
      <video
        src={url}
        controls
        // Metadata only: enough for a first frame and a duration without
        // pulling the whole file down for a message nobody has played.
        preload="metadata"
        className="max-h-72 max-w-full rounded-lg bg-black"
      />
    )
  }

  if (mime.family === 'audio') {
    // A waveform would need the amplitude envelope, which is not in the file the
    // recorder produces; what a voice note gets is the player's own bar.
    return <VoiceMessagePlayer src={url} />
  }

  return (
    <a
      href={url}
      download={displayName(fileName, attachmentId, mime)}
      className="flex w-56 max-w-full items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-left transition-colors duration-150 hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <FileText className="size-5 shrink-0 text-fg-muted" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs text-fg">
          {displayName(fileName, attachmentId, mime)}
        </span>
        <span className="text-[11px] text-fg-muted tabular-nums">{formatBytes(size)}</span>
      </span>
      <Download className="size-4 shrink-0 text-fg-muted" aria-hidden />
    </a>
  )
}
