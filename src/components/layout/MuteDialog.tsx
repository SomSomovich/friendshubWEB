import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

/**
 * Unmuting is a different endpoint from muting, so the choice is a
 * discriminated value rather than a nullable duration.
 */
export type MuteChoice =
  | { kind: 'mute'; durationSeconds: number | null }
  | { kind: 'unmute' }

export type MuteDialogProps = {
  open: boolean
  /** True when the conversation is muted, so the dialog can offer to lift it. */
  muted: boolean
  title: string
  onClose: () => void
  onChoose: (choice: MuteChoice) => void
}

/**
 * The mute durations, as a dialog rather than a submenu: six choices do not
 * belong in a menu that already has four entries, and a dialog works the same on
 * touch.
 */
const DURATIONS: Array<{ id: string; seconds: number | null; labelKey: ParseKeys }> = [
  { id: 'hour', seconds: 3_600, labelKey: 'mute.hour' },
  { id: 'eight-hours', seconds: 8 * 3_600, labelKey: 'mute.eightHours' },
  { id: 'day', seconds: 24 * 3_600, labelKey: 'mute.day' },
  { id: 'week', seconds: 7 * 24 * 3_600, labelKey: 'mute.week' },
  { id: 'forever', seconds: null, labelKey: 'mute.forever' },
]

export function MuteDialog({ open, muted, title, onClose, onChoose }: MuteDialogProps) {
  const { t } = useTranslation()

  return (
    <Modal open={open} onClose={onClose} title={t('mute.title', { title })}>
      <div className="flex flex-col gap-1">
        {muted ? (
          <Button
            variant="secondary"
            className="justify-start"
            onClick={() => {
              onChoose({ kind: 'unmute' })
              onClose()
            }}
          >
            {t('mute.unmute')}
          </Button>
        ) : null}

        {DURATIONS.map((duration) => (
          <Button
            key={duration.id}
            variant="ghost"
            className="justify-start"
            onClick={() => {
              onChoose({ kind: 'mute', durationSeconds: duration.seconds })
              onClose()
            }}
          >
            {t(duration.labelKey)}
          </Button>
        ))}
      </div>
    </Modal>
  )
}
