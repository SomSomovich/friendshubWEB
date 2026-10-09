import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

export type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
  /** A control beside the title — the pencil that leads to a group's settings. */
  headerAction?: ReactNode
}

/**
 * The dialogs that are open, innermost last.
 *
 * Two can be open at once — a member's profile over a group's, an admin-rights
 * editor over a member list — and Escape must close the one in front. Both
 * listen on `document` with capture, and `stopPropagation` does not stop the
 * other listeners on the same node, so the browser will not decide this for us.
 */
const openModals: symbol[] = []

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Rendered into a portal so a modal is never clipped by an ancestor's overflow.
 *
 * Escape closes it, Tab is trapped inside it, the page behind it does not
 * scroll, and focus goes back to whatever opened it — the four things that make
 * a dialog feel broken when they are missing.
 */
export function Modal({ open, onClose, title, children, footer, size = 'md', headerAction }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const token = Symbol('modal')
    openModals.push(token)

    const restoreFocusTo =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function focusableElements(): HTMLElement[] {
      const panel = panelRef.current
      if (panel === null) {
        return []
      }
      return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
        (element) => element.offsetParent !== null,
      )
    }

    function handleKeyDown(event: KeyboardEvent): void {
      // Only the dialog in front reacts: a dialog underneath must not answer an
      // Escape that was meant for the one the reader is looking at.
      if (openModals.at(-1) !== token) {
        return
      }
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') {
        return
      }

      const focusable = focusableElements()
      const first = focusable.at(0)
      const last = focusable.at(-1)

      if (first === undefined || last === undefined) {
        event.preventDefault()
        panelRef.current?.focus()
        return
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
        return
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    const initial = focusableElements().at(0) ?? panelRef.current
    initial?.focus()

    return () => {
      // Dropped first: from here on, whatever this dialog covered answers for
      // itself again.
      const index = openModals.indexOf(token)
      if (index !== -1) {
        openModals.splice(index, 1)
      }
      document.removeEventListener('keydown', handleKeyDown, true)
      document.body.style.overflow = previousOverflow
      restoreFocusTo?.focus()
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fh-fade bg-black/50" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'animate-fh-pop relative z-10 flex max-h-[90vh] w-full flex-col border border-border bg-bg shadow-lg outline-none',
          'rounded-t-2xl sm:rounded-2xl',
          size === 'lg' ? 'sm:max-w-lg' : 'sm:max-w-sm',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-4">
          <h2 id={titleId} className="text-base font-semibold text-fg">
            {title}
          </h2>
          {/* Reversed on purpose: the header action is drawn to the left of the
              close button, but the close button stays first in the DOM — and
              therefore the one a dialog that has just opened puts focus on. */}
          <div className="flex shrink-0 flex-row-reverse items-center gap-1">
            <CloseButton onClose={onClose} />
            {headerAction}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>

        {footer === undefined ? null : (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border p-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}

function CloseButton({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={t('common.close')}
      className="-m-1 flex size-8 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
    >
      <X className="size-4" aria-hidden />
    </button>
  )
}
