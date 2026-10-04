import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:brightness-110',
  secondary: 'border border-border bg-bg-elevated text-fg hover:bg-bg-hover',
  ghost: 'text-fg hover:bg-bg-hover',
  danger: 'bg-danger text-danger-fg hover:brightness-110',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-5 text-base',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows a spinner and blocks interaction until the work finishes. */
  loading?: boolean
  children?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || loading}
      aria-busy={loading ? true : undefined}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-lg font-medium whitespace-nowrap transition-[filter,background-color,color] duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : null}
      {children}
    </button>
  )
}
