const currencyFormatter = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 0,
})

const currencyFormatterWithCents = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(value?: number | null, withCents = false) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '₡0'
  }
  return (withCents ? currencyFormatterWithCents : currencyFormatter).format(
    Number(value),
  )
}

export function formatNumber(value?: number | null) {
  if (value === null || value === undefined) return '0'
  return new Intl.NumberFormat('es-CR').format(Number(value))
}

export function formatDate(value?: string | Date | null) {
  if (!value) return '—'
  const date = new Date(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00-06:00` : value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CR', {
    timeZone: 'America/Costa_Rica',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateShort(value?: string | Date | null) {
  if (!value) return '—'
  const date = new Date(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00-06:00` : value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CR', {
    timeZone: 'America/Costa_Rica',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return '—'
  const date = new Date(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00-06:00` : value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CR', {
    timeZone: 'America/Costa_Rica',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function isoDate(value: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value)
  const part = (type: string) => parts.find((item) => item.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function addDays(value: Date | string, days: number) {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

export const frequencyLabels: Record<string, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
}

export const frequencyPluralLabels: Record<string, string> = {
  WEEKLY: 'semanales',
  BIWEEKLY: 'quincenales',
  MONTHLY: 'mensuales',
}

export function formatTermWeeks(weeks?: number | null) {
  const value = Number(weeks)
  if (!Number.isFinite(value) || value <= 0) return '—'
  return value === 1 ? '1 semana' : `${value} semanas`
}

export function formatInstallmentCount(count?: number | null) {
  const value = Number(count)
  if (!Number.isFinite(value) || value <= 0) return '—'
  return value === 1 ? '1 cuota' : `${value} cuotas`
}

export function formatInstallments(count: number | null | undefined, frequency: string) {
  const value = Number(count)
  const frequencyLabel =
    value === 1
      ? frequencyLabels[frequency]?.toLowerCase()
      : frequencyPluralLabels[frequency]
  return frequencyLabel
    ? `${formatInstallmentCount(value)} ${frequencyLabel}`
    : formatInstallmentCount(value)
}

export const statusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  SUBMITTED: 'Recibida',
  UNDER_REVIEW: 'En revisión',
  INFO_REQUESTED: 'Información solicitada',
  RECOMMENDED: 'Recomendada',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
  PENDING_DISBURSEMENT: 'Pendiente de desembolso',
  ACTIVE: 'Activo',
  PAID: 'Pagado',
  REFINANCED: 'Cancelado por renovación',
  DEFAULTED: 'En mora',
  PENDING: 'Pendiente',
  PARTIAL: 'Parcial',
  OVERDUE: 'Vencida',
  ACTIVE_USER: 'Activo',
  INACTIVE: 'Inactivo',
}

export const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  CLERK: 'Oficinista',
  COLLECTOR: 'Cobrador',
  CLIENT: 'Cliente',
}

export const methodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  REFINANCE: 'Cancelación por renovación (sin efectivo)',
  TRANSFER: 'Transferencia',
  SINPE: 'SINPE Móvil',
  DEPOSIT: 'Depósito',
  OTHER: 'Otro',
}

export const documentTypeLabels: Record<string, string> = {
  ID_CARD: 'Cédula de identidad',
  INCOME_PROOF: 'Comprobante de ingresos',
  RESUME: 'Hoja de vida',
  REFERENCE: 'Referencia',
  OTHER: 'Otro documento',
}
