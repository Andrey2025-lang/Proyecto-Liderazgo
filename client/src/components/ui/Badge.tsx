import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'green' | 'gold' | 'blue' | 'red' | 'purple'

const tones: Record<Tone, string> = {
  neutral: 'bg-forest-50 text-forest-700 ring-forest-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  gold: 'bg-amber-50 text-amber-800 ring-amber-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  purple: 'bg-violet-50 text-violet-700 ring-violet-200',
}

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
