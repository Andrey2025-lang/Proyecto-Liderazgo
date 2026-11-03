import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <div>
      <select
        ref={ref}
        className={cn('input-base appearance-none', error && 'border-red-500', className)}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  ),
)
Select.displayName = 'Select'
