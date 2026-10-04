import { useState } from 'react'
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
  /** Image URL; falls back to initials when absent or when it fails to load. */
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
  // Which URL failed, rather than a flag: a new `src` then clears the fallback on
  // its own, with no effect to synchronise.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  // A missing avatar is a 404, not a missing URL: most accounts have none, so
  // the initials are the normal case rather than an error path.
  const showImage =
    src !== undefined && src !== null && src.length > 0 && src !== failedSrc
  const accessible =
    label === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label }

  return (
    <span
      {...accessible}
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-hover font-semibold text-fg-muted select-none',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          onError={() => {
            setFailedSrc(src ?? null)
          }}
        />
      ) : (
        <span aria-hidden>{initialsOf(name)}</span>
      )}
    </span>
  )
}
