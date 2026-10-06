import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

/**
 * The shape of something that has not arrived yet.
 *
 * A skeleton is not a spinner with better manners: it says *what* is coming —
 * a row, a paragraph, a bubble — so the screen does not jump when the answer
 * lands. One block primitive, composed per screen, keeps each shape next to the
 * markup it stands in for instead of in a drawer of named variants.
 *
 * Hidden from assistive technology by default: a dozen shimmering boxes are
 * noise to a screen reader, and the surrounding region already announces that it
 * is loading. Pass `label` where the skeleton is the *only* thing on screen, so
 * that announcement exists.
 */
export type SkeletonProps = {
  className?: string
  /** Announced to a screen reader; omit where something else already says it. */
  label?: string
}

export function Skeleton({ className, label }: SkeletonProps) {
  return (
    <span
      {...(label === undefined
        ? { 'aria-hidden': true }
        : { role: 'status', 'aria-label': label })}
      className={cn('block animate-pulse rounded-md bg-bg-hover', className)}
    />
  )
}

export type SkeletonRowsProps = {
  count: number
  /** One row's shape; two list screens want very different ones. */
  row: ReactNode
  className?: string
}

/** `count` copies of a row shape, for the lists that are simply "more rows". */
export function SkeletonRows({ count, row, className }: SkeletonRowsProps) {
  return (
    <div aria-hidden className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>{row}</div>
      ))}
    </div>
  )
}
