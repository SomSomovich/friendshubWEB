import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'

export function AvatarViewer({ open, src, label, onClose }: { open: boolean; src: string | null; label: string; onClose: () => void }) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [onClose, open])

  if (!open || src === null) return null

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t('profile.avatar')} className="animate-fh-fade fixed inset-0 z-[80] flex items-center justify-center bg-black" onClick={onClose}>
      <button type="button" aria-label={t('common.close')} onClick={onClose} className="absolute top-3 right-3 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        <X className="size-5" aria-hidden />
      </button>
      <img src={src} alt={label} className="max-h-full max-w-full object-contain" onClick={(event) => event.stopPropagation()} />
    </div>,
    document.body,
  )
}
