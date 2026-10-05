import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import type { AttachmentMime } from '../../attachments/mime'

export type AttachmentViewerProps = {
  open: boolean
  url: string | null
  mime: AttachmentMime | null
  onClose: () => void
}

/**
 * A picture or a video, filling the screen.
 *
 * A portal rather than a modal component: this is not a dialog with a title and
 * actions, it is the file itself, and the only affordance is getting out — by
 * the button, by Escape, or by tapping the backdrop.
 *
 * The object URL belongs to whatever opened this and is deliberately not revoked
 * here: closing the viewer should not blank the thumbnail that is still on
 * screen behind it.
 */
export function AttachmentViewer({ open, url, mime, onClose }: AttachmentViewerProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) {
      return
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, onClose])

  if (!open || url === null || mime === null) {
    return null
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(mime.family === 'video' ? 'chat.attach.video' : 'chat.attach.photo')}
      className="animate-fh-fade fixed inset-0 z-[80] flex items-center justify-center bg-black"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
        className="absolute top-3 right-3 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <X className="size-5" aria-hidden />
      </button>

      {mime.family === 'video' ? (
        <video
          src={url}
          controls
          autoPlay
          // Stopped so the click that closes the viewer is not swallowed by the
          // element's own controls.
          onClick={(event) => {
            event.stopPropagation()
          }}
          className="max-h-full max-w-full"
        />
      ) : (
        <img src={url} alt="" className="max-h-full max-w-full object-contain" />
      )}
    </div>,
    document.body,
  )
}
