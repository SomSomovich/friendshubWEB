import { FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import type { AttachmentKind } from './MessageComposer'

export type AttachmentPreviewDialogProps = {
  file: File
  kind: AttachmentKind
  onClose: () => void
}

/**
 * What the user picked, before anything is uploaded.
 *
 * The upload pipeline — chunking, sealing, the attachment-key envelope — is
 * subphase 4.9, and this dialog does not pretend otherwise: it says so and
 * offers no send button rather than one that silently does nothing.
 *
 * The caller mounts it only while a file is chosen, so the object URL below is
 * created exactly once per pick.
 */
export function AttachmentPreviewDialog({ file, kind, onClose }: AttachmentPreviewDialogProps) {
  const { t } = useTranslation()

  // An object URL pins its whole blob in memory, so it is made lazily on the
  // one render that needs it and released when the dialog goes away.
  const [objectUrl] = useState(() => (kind === 'file' ? null : URL.createObjectURL(file)))
  useEffect(() => {
    if (objectUrl === null) {
      return
    }
    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  return (
    <Modal
      open
      onClose={onClose}
      title={t(`chat.attach.${kind}`)}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-center overflow-hidden rounded-xl border border-border bg-bg">
          {objectUrl === null ? (
            <FileText className="my-10 size-10 text-fg-muted" aria-hidden />
          ) : kind === 'photo' ? (
            <img src={objectUrl} alt="" className="max-h-72 w-full object-contain" />
          ) : (
            <video src={objectUrl} controls className="max-h-72 w-full" />
          )}
        </div>

        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-fg-muted">{t('chat.attach.name')}</dt>
            <dd className="min-w-0 truncate text-fg">{file.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-fg-muted">{t('chat.attach.size')}</dt>
            <dd className="text-fg tabular-nums">{formatBytes(file.size)}</dd>
          </div>
        </dl>

        <p className="rounded-lg border border-border bg-bg-elevated p-3 text-xs text-fg-muted">
          {t('chat.attach.notYet')}
        </p>
      </div>
    </Modal>
  )
}

/** Binary units, the same ones a file manager shows. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  const units = ['KiB', 'MiB', 'GiB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex] ?? 'KiB'}`
}
