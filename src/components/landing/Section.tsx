import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export type SectionProps = {
  /** Anchor target for the header's navigation. */
  id: string
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}

export function Section({ id, title, subtitle, children, className }: SectionProps) {
  return (
    <section id={id} className={cn('mx-auto w-full max-w-5xl px-5 py-12 sm:py-16', className)}>
      <h2 className="text-center text-2xl font-semibold text-balance text-fg sm:text-3xl">
        {title}
      </h2>
      {subtitle === undefined ? null : (
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-pretty text-fg-muted">
          {subtitle}
        </p>
      )}
      <div className="mt-8">{children}</div>
    </section>
  )
}
