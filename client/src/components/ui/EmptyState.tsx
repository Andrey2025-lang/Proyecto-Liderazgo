import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-forest-900/15 bg-white/60 px-6 py-14 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-forest-50 text-forest-600">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="font-display text-lg font-semibold text-forest-950">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-ink/55">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
