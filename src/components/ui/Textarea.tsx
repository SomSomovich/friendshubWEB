import { useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string
  error?: string | null
  helper?: string | null
  hideLabel?: boolean
}

export function Textarea({
  label,
  error,
  helper,
  hideLabel = false,
  className,
  rows = 3,
  ...rest
}: TextareaProps) {
  const id = useId()
  const describedBy = error !== null && error !== undefined ? `${id}-error` : helper ? `${id}-helper` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={cn('text-xs font-medium text-fg-muted', hideLabel && 'sr-only')}>
        {label}
      </label>

      <textarea
        id={id}
        rows={rows}
        aria-invalid={error !== null && error !== undefined ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'w-full resize-y rounded-lg border bg-bg-elevated px-3 py-2 text-sm text-fg placeholder:text-fg-muted',
          'transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error !== null && error !== undefined ? 'border-danger' : 'border-border',
          className,
        )}
        {...rest}
      />

      {error !== null && error !== undefined ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : helper ? (
        <p id={`${id}-helper`} className="text-xs text-fg-muted">
          {helper}
        </p>
      ) : null}
    </div>
  )
}
