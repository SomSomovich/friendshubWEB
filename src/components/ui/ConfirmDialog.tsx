import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { Modal } from './Modal'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  /** What the action will do, in the user's terms — not a restatement of the title. */
  description: string
  confirmLabel: string
  /** Destructive actions get the danger colour; the default is a plain confirm. */
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * The "are you sure?" step in front of anything that cannot be undone.
 *
 * The confirming button is never the one that already has focus, so a stray
 * Enter on a dialog that just appeared cannot delete a conversation.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            loading={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-pretty text-fg-muted">{description}</p>
    </Modal>
  )
}
