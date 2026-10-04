import { cn } from '../../utils/cn'

export type StepIndicatorProps = {
  /** One translated label per step, in order. */
  labels: string[]
  /** Zero-based index of the step on screen. */
  current: number
}

/**
 * Where the wizard is and how much is left.
 *
 * Every step is named rather than numbered: "Members" says what is coming, and a
 * bare "2/3" does not.
 */
export function StepIndicator({ labels, current }: StepIndicatorProps) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {labels.map((label, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition-colors duration-150',
                active && 'border-accent bg-accent/15 font-medium text-fg',
                done && 'border-border text-fg-muted',
                !active && !done && 'border-border text-fg-muted',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'flex size-4 items-center justify-center rounded-full text-[10px] tabular-nums',
                  active ? 'bg-accent text-accent-fg' : 'bg-bg-hover text-fg-muted',
                )}
              >
                {index + 1}
              </span>
              {label}
            </span>
            {index === labels.length - 1 ? null : (
              <span aria-hidden className="h-px w-4 bg-border" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
