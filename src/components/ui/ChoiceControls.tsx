import { Check } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

type CheckboxControlProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>

/** A native, keyboard-accessible checkbox with a themed visual indicator. */
export function CheckboxControl(props: CheckboxControlProps) {
  return (
    <>
      <input {...props} type="checkbox" className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          'pointer-events-none inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-border bg-bg-elevated text-transparent shadow-sm',
          'transition-[background-color,border-color,color,box-shadow] duration-150',
          'peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-fg',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
          'peer-disabled:opacity-50',
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    </>
  )
}

type RadioControlProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>

/** A native, keyboard-accessible radio with a themed visual indicator. */
export function RadioControl(props: RadioControlProps) {
  return (
    <>
      <input {...props} type="radio" className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          'pointer-events-none relative inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border border-border bg-bg-elevated',
          'transition-[background-color,border-color,box-shadow] duration-150',
          'after:size-2 after:scale-50 after:rounded-full after:bg-accent-fg after:opacity-0 after:content-[""] after:transition-[opacity,transform] after:duration-150',
          'peer-checked:border-accent peer-checked:bg-accent peer-checked:after:scale-100 peer-checked:after:opacity-100',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
          'peer-disabled:opacity-50',
        )}
      />
    </>
  )
}
