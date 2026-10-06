import type { ReactNode, Ref } from 'react'
import { cn } from '../../utils/cn'

export type CallButtonTone = 'neutral' | 'active' | 'danger' | 'accept'

const TONE_CLASSES: Record<CallButtonTone, string> = {
  neutral: 'bg-bg-hover text-fg hover:bg-border',
  // The speaker toggle's "on": a solid white disc, which is the one control on
  // the bar that reads as a switch rather than an action.
  active: 'bg-white text-black',
  danger: 'bg-danger text-danger-fg hover:brightness-110',
  accept: 'bg-online text-white hover:brightness-110',
}

export type CallButtonProps = {
  /** Localised, and the only name the button has — these are icon-only. */
  label: string
  onClick: () => void
  tone?: CallButtonTone
  /** For the toggle-shaped controls; drives `aria-pressed`. */
  pressed?: boolean
  /** A pill with a visible caption, for the end-call button. */
  caption?: string
  /**
   * Forwards the button element, so the incoming overlay can put focus on the
   * one control the keyboard user is most likely to want.
   */
  buttonRef?: Ref<HTMLButtonElement>
  children: ReactNode
}

/**
 * One round control on the call screen, or the pill that ends it.
 *
 * Every control is icon-only, so the labelled name is not decoration: without it
 * a screen reader announces four unnamed buttons, and the switch-camera control
 * — which has no visible label at all — has nothing to say to anybody.
 */
export function CallButton({
  label,
  onClick,
  tone = 'neutral',
  pressed,
  caption,
  buttonRef,
  children,
}: CallButtonProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-full transition-[background-color,filter] duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        caption === undefined ? 'w-14' : 'px-6',
        TONE_CLASSES[tone],
      )}
    >
      {children}
      {caption === undefined ? null : <span className="text-sm font-semibold">{caption}</span>}
    </button>
  )
}
