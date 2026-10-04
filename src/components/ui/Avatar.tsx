import { cn } from '../../utils/cn'
import { initialsOf } from '../../utils/initials'

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-20 text-2xl',
}

export type AvatarProps = {
  /** Used for the initials and, when `label` is given, for the accessible name. */
  name: string
  /** Image URL; falls back to initials when absent. */
  src?: string | null
  size?: AvatarSize
  /**
   * Accessible name. Omit it where the name is already read next to the avatar —
   * a decorative duplicate is noise for a screen reader.
   */
  label?: string
  className?: string
}

export function Avatar({ name, src, size = 'md', label, className }: AvatarProps) {
  const image = src !== null && src !== undefined && src.length > 0
  const accessible = label === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label }

  return (
    <span
      {...accessible}
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-hover font-semibold text-fg-muted select-none',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {image ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initialsOf(name)}</span>
      )}
    </span>
  )
}
