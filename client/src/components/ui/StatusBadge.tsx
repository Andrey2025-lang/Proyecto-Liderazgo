import { Badge } from './Badge'
import { statusLabels } from '@/lib/format'

const toneForStatus: Record<
  string,
  'neutral' | 'green' | 'gold' | 'blue' | 'red' | 'purple'
> = {
  DRAFT: 'neutral',
  SUBMITTED: 'blue',
  UNDER_REVIEW: 'gold',
  INFO_REQUESTED: 'purple',
  RECOMMENDED: 'gold',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'neutral',
  PENDING_DISBURSEMENT: 'gold',
  ACTIVE: 'green',
  PAID: 'blue',
  REFINANCED: 'purple',
  DEFAULTED: 'red',
  PENDING: 'neutral',
  PARTIAL: 'gold',
  OVERDUE: 'red',
  ACTIVE_USER: 'green',
  INACTIVE: 'neutral',
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={toneForStatus[status] || 'neutral'}>{statusLabels[status] || status}</Badge>
}
