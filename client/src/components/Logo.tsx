import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export function Logo({
  to = '/',
  compact = false,
  inverted = false,
  className,
}: {
  to?: string
  compact?: boolean
  inverted?: boolean
  className?: string
}) {
  return (
    <Link to={to} className={cn('group inline-flex items-center', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center bg-[#fcfaf3] shadow-sm ring-1 ring-forest-900/10 transition group-hover:-translate-y-0.5 group-hover:shadow-md',
          compact ? 'rounded-full p-0.5' : 'rounded-2xl p-1.5',
          inverted && 'ring-cream/20',
        )}
      >
        <img
          src={compact ? '/prestamos-jyc-icon.png' : '/prestamos-jyc-logo.png'}
          alt="Préstamos J&C"
          className={cn(
            'object-contain',
            compact ? 'h-10 w-10 rounded-full' : 'h-14 w-auto sm:h-16',
          )}
        />
      </span>
    </Link>
  )
}
