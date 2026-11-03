import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <div>
      <input
        ref={ref}
        className={cn(
          'input-base',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/10',
          className,
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  ),
)
Input.displayName = 'Input'
