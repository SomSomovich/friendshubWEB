import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { Modal } from './Modal'

export type DurationDialogProps = {
  open: boolean
  title: string
  hint: ReactNode
  confirmLabel: string
  minSeconds: number
  maxSeconds: number
  initialSeconds: number
  onClose: () => void
  onChoose: (seconds: number) => void
  warningForSeconds?: (seconds: number) => string | null
  loading?: boolean
}

/** The shared hours/minutes picker for scheduled sends and temporary rooms. */
export function DurationDialog(props: DurationDialogProps) {
  if (!props.open) return null
  return <OpenDurationDialog {...props} />
}

function OpenDurationDialog({
  title,
  hint,
  confirmLabel,
  minSeconds,
  maxSeconds,
  initialSeconds,
  onClose,
  onChoose,
  warningForSeconds,
  loading = false,
}: Omit<DurationDialogProps, 'open'>) {
  const { t } = useTranslation()
  const hoursId = useId()
  const minutesId = useId()
  const [hours, setHours] = useState(String(Math.floor(initialSeconds / 3600)))
  const [minutes, setMinutes] = useState(String(Math.floor((initialSeconds % 3600) / 60)))

  const numericHours = Number(hours)
  const numericMinutes = Number(minutes)
  const seconds = numericHours * 3600 + numericMinutes * 60
  const valid =
    Number.isInteger(numericHours) &&
    Number.isInteger(numericMinutes) &&
    numericHours >= 0 &&
    numericHours <= Math.floor(maxSeconds / 3600) &&
    numericMinutes >= 0 &&
    numericMinutes <= 59 &&
    seconds >= minSeconds &&
    seconds <= maxSeconds
  const warning = valid ? warningForSeconds?.(seconds) ?? null : null

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" disabled={loading} onClick={onClose}>{t('common.cancel')}</Button>
          <Button loading={loading} disabled={!valid} onClick={() => onChoose(seconds)}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-fg-muted">{hint}</p>
        <div className="grid grid-cols-2 gap-3">
          <label htmlFor={hoursId} className="flex flex-col gap-1 text-xs font-medium text-fg-muted">
            {t('duration.hours')}
            <input
              id={hoursId}
              type="number"
              min={0}
              max={Math.floor(maxSeconds / 3600)}
              step={1}
              inputMode="numeric"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label htmlFor={minutesId} className="flex flex-col gap-1 text-xs font-medium text-fg-muted">
            {t('duration.minutes')}
            <input
              id={minutesId}
              type="number"
              min={0}
              max={59}
              step={1}
              inputMode="numeric"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
        </div>
        {valid ? null : (
          <p role="alert" className="text-xs text-danger">
            {t('duration.rangeError', {
              min: formatDuration(minSeconds),
              max: formatDuration(maxSeconds),
            })}
          </p>
        )}
        {warning === null ? null : <p role="status" className="text-xs text-danger">{warning}</p>}
      </div>
    </Modal>
  )
}

function formatDuration(seconds: number): string {
  const totalMinutes = Math.ceil(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}:${String(minutes).padStart(2, '0')}`
}
