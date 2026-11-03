import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-6 w-6 animate-spin text-forest-700', className)} />
}

export function LoadingBlock({ label = 'Cargando información…' }: { label?: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-sm text-ink/50">
      <Spinner />
      <span>{label}</span>
    </div>
  )
}
