import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <div>
      <textarea
        ref={ref}
        className={cn('input-base min-h-24 resize-y', error && 'border-red-500', className)}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  ),
)
Textarea.displayName = 'Textarea'
