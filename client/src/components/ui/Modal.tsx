import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-forest-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-4xl bg-cream shadow-2xl sm:rounded-4xl',
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-forest-900/10 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-forest-950">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink/55">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink/45 transition hover:bg-forest-50 hover:text-forest-900"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-forest-900/10 bg-white px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
