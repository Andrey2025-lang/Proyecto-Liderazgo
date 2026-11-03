import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card-base', className)} {...props} />
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-4 border-b border-forest-900/10 px-5 py-4 sm:px-6',
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="font-display text-lg font-semibold text-forest-950">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-ink/55">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 sm:p-6', className)} {...props} />
}
