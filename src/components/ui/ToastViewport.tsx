import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToastStore, type Toast } from '../../state/toastStore'
import { cn } from '../../utils/cn'

/**
 * The stack of notifications.
 *
 * Mounted once, next to the router. Each toast dismisses itself on a timer, and
 * the timer belongs to the toast rather than to the store so a re-render from an
 * unrelated update cannot restart it.
 */
export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts)

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-80">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

const KIND_CLASSES: Record<Toast['kind'], string> = {
  info: 'border-border',
  success: 'border-online',
  error: 'border-danger',
}

function ToastCard({ toast }: { toast: Toast }) {
  const { t } = useTranslation()
  const dismiss = useToastStore((state) => state.dismiss)

  useEffect(() => {
    const timer = setTimeout(() => {
      dismiss(toast.id)
    }, toast.timeoutMs)
    return () => {
      clearTimeout(timer)
    }
  }, [toast.id, toast.timeoutMs, dismiss])

  return (
    <div
      // Errors interrupt; anything else waits for a pause.
      role={toast.kind === 'error' ? 'alert' : 'status'}
      className={cn(
        'animate-fh-pop pointer-events-auto flex items-start gap-3 rounded-xl border bg-bg-elevated p-3 shadow-lg',
        KIND_CLASSES[toast.kind],
      )}
    >
      <p className="min-w-0 flex-1 text-sm break-words text-fg">{toast.message}</p>

      {toast.actionLabel === null || toast.onAction === null ? null : (
        <button
          type="button"
          onClick={() => {
            toast.onAction?.()
            dismiss(toast.id)
          }}
          className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-xs font-semibold text-accent hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          {toast.actionLabel}
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          dismiss(toast.id)
        }}
        aria-label={t('common.close')}
        className="-m-1 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}
