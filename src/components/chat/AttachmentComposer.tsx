import type { TFunction } from 'i18next'
import { FileText, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatBytes } from '../../attachments/display'
import type { PendingAttachment } from '../../attachments/prepare'
import type { UploadProgress } from '../../attachments/send'
import { cn } from '../../utils/cn'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

export type AttachmentComposerProps = {
  open: boolean
  attachments: PendingAttachment[]
  caption: string
  onCaptionChange: (caption: string) => void
  onToggleCompress: (id: string, compress: boolean) => void
  onRemove: (id: string) => void
  progress: UploadProgress | null
  error: string | null
  onSend: () => void
  onClose: () => void
}

/**
 * The last look before a file is uploaded.
 *
 * Uploading is not undoable — the bytes are on the server and the recipients
 * have the key — so this is the only point at which a mistake is cheap. It is
 * also where the caption is written, because a photo sent with a sentence is a
 * different thing from a photo sent alone.
 */
export function AttachmentComposer({
  open,
  attachments,
  caption,
  onCaptionChange,
  onToggleCompress,
  onRemove,
  progress,
  error,
  onSend,
  onClose,
}: AttachmentComposerProps) {
  const { t } = useTranslation()
  const uploading = progress !== null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('chat.attach.previewTitle')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" disabled={uploading} onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button loading={uploading} onClick={onSend}>
            {t('chat.send')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2">
          {attachments.map((attachment, index) => (
            <li
              key={attachment.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-2',
                progress !== null && progress.fileIndex === index
                  ? 'border-accent bg-bg'
                  : 'border-border bg-bg',
              )}
            >
              <AttachmentThumb attachment={attachment} />

              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm text-fg">{attachment.name}</span>
                <span className="text-xs text-fg-muted tabular-nums">
                  {sizeLabel(attachment, t)}
                </span>
                {progress !== null && progress.fileIndex === index ? (
                  <span className="mt-1 h-1 w-full overflow-hidden rounded-full bg-bg-hover">
                    <span
                      className="block h-full rounded-full bg-accent transition-[width] duration-150"
                      style={{ width: `${Math.round(progress.fraction * 100)}%` }}
                    />
                  </span>
                ) : null}
              </div>

              {attachment.compressedSize === null ? null : (
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-fg-muted">
                  <input
                    type="checkbox"
                    checked={!attachment.compress}
                    disabled={uploading}
                    onChange={(event) => {
                      onToggleCompress(attachment.id, !event.target.checked)
                    }}
                    className="size-4 cursor-pointer accent-accent"
                  />
                  {t('chat.attach.uncompressed')}
                </label>
              )}

              <button
                type="button"
                aria-label={t('chat.attach.remove', { name: attachment.name })}
                disabled={uploading}
                onClick={() => {
                  onRemove(attachment.id)
                }}
                className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-50"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>

        <textarea
          rows={2}
          value={caption}
          disabled={uploading}
          onChange={(event) => {
            onCaptionChange(event.target.value)
          }}
          placeholder={t('chat.attach.caption')}
          aria-label={t('chat.attach.caption')}
          className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        />

        {error === null ? null : (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}

function AttachmentThumb({ attachment }: { attachment: PendingAttachment }) {
  const { t } = useTranslation()

  if (attachment.previewUrl !== null) {
    return (
      <img
        src={attachment.previewUrl}
        alt=""
        className="size-12 shrink-0 rounded-md object-cover"
      />
    )
  }

  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-bg-hover text-fg-muted">
      <FileText className="size-5" aria-hidden />
      <span className="sr-only">{t('chat.attach.file')}</span>
    </span>
  )
}

/**
 * What the file weighs, and what it would weigh.
 *
 * Both numbers, when both are known: "12.4 МиБ → 1.8 МиБ" is the whole argument
 * for the checkbox, and neither number on its own makes it.
 */
function sizeLabel(attachment: PendingAttachment, t: TFunction): string {
  const original = formatBytes(attachment.blob.size)
  if (attachment.compressedSize === null || attachment.compressedSize >= attachment.blob.size) {
    return original
  }
  return t('chat.attach.sizeComparison')
    .replace('{{from}}', original)
    .replace('{{to}}', formatBytes(attachment.compressedSize))
}
