import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'green',
}: {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
  tone?: 'green' | 'gold' | 'blue' | 'red' | 'neutral'
}) {
  const tones = {
    green: 'bg-forest-50 text-forest-700',
    gold: 'bg-amber-50 text-amber-700',
    blue: 'bg-sky-50 text-sky-700',
    red: 'bg-red-50 text-red-700',
    neutral: 'bg-forest-900/5 text-forest-700',
  }
  return (
    <div className="card-base p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink/55">{label}</p>
        {Icon && (
          <span
            className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl', tones[tone])}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-forest-950">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink/45">{hint}</p>}
    </div>
  )
}
