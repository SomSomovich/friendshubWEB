import { Eye, EyeOff } from 'lucide-react'
import { useId, useState, type InputHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string
  /** Shown under the field and marked as invalid; `null` clears it. */
  error?: string | null
  /** Shown under the field when there is no error. */
  helper?: string | null
  /** Hides the label visually while keeping it for screen readers. */
  hideLabel?: boolean
}

export function Input({ label, error, helper, hideLabel = false, className, type = 'text', ...rest }: InputProps) {
  const id = useId()
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(false)

  const isPassword = type === 'password'
  const describedBy = error !== null && error !== undefined ? `${id}-error` : helper ? `${id}-helper` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={cn('text-xs font-medium text-fg-muted', hideLabel && 'sr-only')}
      >
        {label}
      </label>

      <div className="relative flex items-center">
        <input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error !== null && error !== undefined ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-10 w-full rounded-lg border bg-bg-elevated px-3 text-sm text-fg placeholder:text-fg-muted',
            'transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error !== null && error !== undefined ? 'border-danger' : 'border-border',
            isPassword && 'pr-10',
            className,
          )}
          {...rest}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => {
              setRevealed((value) => !value)
            }}
            aria-label={revealed ? t('common.hidePassword') : t('common.showPassword')}
            aria-pressed={revealed}
            className="absolute right-1 flex size-8 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          >
            {revealed ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        ) : null}
      </div>

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
