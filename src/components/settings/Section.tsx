import { ChevronRight } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../utils/cn'

export type SettingsCardProps = {
  title: string
  description?: string
  children: ReactNode
}

/** One titled block of settings. */
export function SettingsCard({ title, description, children }: SettingsCardProps) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border bg-bg-elevated p-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {description === undefined ? null : (
          <p className="text-xs text-pretty text-fg-muted">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

export type SettingsRowProps = {
  label: string
  description?: string
  /** The control on the right; it owns its own accessible name where it needs one. */
  children: ReactNode
  /** Stacks the control under the label, for anything wider than a switch. */
  stacked?: boolean
}

export function SettingsRow({ label, description, children, stacked = false }: SettingsRowProps) {
  return (
    <div
      className={cn(
        'gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0',
        stacked ? 'flex flex-col' : 'flex flex-wrap items-center justify-between',
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm text-fg">{label}</span>
        {description === undefined ? null : (
          <span className="text-xs text-pretty text-fg-muted">{description}</span>
        )}
      </div>
      <div className={cn('flex items-center gap-2', stacked && 'w-full')}>{children}</div>
    </div>
  )
}

export type SettingsNavRowProps = {
  to: string
  label: string
  description?: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}

/** A row that leads to a section of its own. */
export function SettingsNavRow({ to, label, description, icon: Icon }: SettingsNavRowProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated px-3 py-2.5 transition-colors duration-150 hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Icon className="size-5 shrink-0 text-fg-muted" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm text-fg">{label}</span>
        {description === undefined ? null : (
          <span className="text-xs text-fg-muted">{description}</span>
        )}
      </span>
      <ChevronRight className="size-4 shrink-0 text-fg-muted" aria-hidden />
    </Link>
  )
}

export type SettingsToggleProps = {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

/**
 * A switch.
 *
 * A native checkbox with `accent-color` was the first attempt and it failed the
 * only test that matters — a 16-pixel dark square on a dark background reads as
 * a rendering bug, not as a control. This is the platform's own switch shape,
 * with the role and the state exposed so it stays a switch to a screen reader.
 */
export function SettingsToggle({ label, checked, disabled, onChange }: SettingsToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled === true}
      onClick={() => {
        onChange(!checked)
      }}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'border-accent bg-accent' : 'border-border bg-bg-hover',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute size-4 rounded-full transition-transform duration-150',
          checked ? 'translate-x-5 bg-accent-fg' : 'translate-x-0.5 bg-fg-muted',
        )}
      />
    </button>
  )
}

export type SettingsChoiceOption<T extends string> = {
  value: T
  label: string
  description?: string
}

export type SettingsChoiceProps<T extends string> = {
  label: string
  value: T
  options: ReadonlyArray<SettingsChoiceOption<T>>
  disabled?: boolean
  onChange: (value: T) => void
}

/** One-of-N, as a radio group so arrow keys move between the options. */
export function SettingsChoice<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: SettingsChoiceProps<T>) {
  // A shared name is what makes the arrow keys move between the options.
  const name = useId()

  return (
    <fieldset className="flex w-full flex-col gap-0.5" disabled={disabled === true}>
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-bg-hover has-disabled:cursor-not-allowed has-disabled:opacity-50"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => {
              onChange(option.value)
            }}
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-accent"
          />
          <span className="flex min-w-0 flex-col">
            <span className="text-sm text-fg">{option.label}</span>
            {option.description === undefined ? null : (
              <span className="text-xs text-pretty text-fg-muted">{option.description}</span>
            )}
          </span>
        </label>
      ))}
    </fieldset>
  )
}
