import { useState } from 'react'
import { PaginatedTable } from '@/components/ui/Pagination'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Download, Receipt, Search } from 'lucide-react'
import { API_URL, api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatCurrency, formatDateTime, methodLabels } from '@/lib/format'
import type { Payment } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingBlock } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'

export function AdminPaymentsPage() {
  const { user } = useAuth()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')

  const paymentsQuery = useQuery<Payment[]>({
    queryKey: ['admin-payments', from, to],
    queryFn: async () =>
      (
        await api.get('/payments', {
          params: { from: from || undefined, to: to || undefined },
        })
      ).data,
  })

  if (paymentsQuery.isLoading) return <LoadingBlock label="Cargando pagos…" />
  const payments = paymentsQuery.data || []
  const term = search.trim().toLowerCase()
  const filtered = term
    ? payments.filter((payment) => {
        const values = [
          payment.receiptNumber,
          payment.listoRecaudoReceipt,
          payment.loan?.client?.name,
          payment.loan?.client?.profile?.cedula,
          payment.collector?.name,
        ]
        return values.some((value) => value?.toLowerCase().includes(term))
      })
    : payments
  const valid = payments.filter((payment) => !payment.voidedAt)
  const total = valid.filter((payment) => payment.method !== 'REFINANCE').reduce((sum, payment) => sum + payment.amount, 0)
  const cash = valid
    .filter((payment) => payment.method === 'CASH')
    .reduce((sum, payment) => sum + payment.amount, 0)
  const canExport = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR'
  const query = new URLSearchParams()
  if (from) query.set('from', from)
  if (to) query.set('to', to)
  if (search.trim()) query.set('search', search.trim())

  return (
    <div>
      <PageHeader
        eyebrow="Cobros"
        title="Pagos"
        description="Consultá los pagos registrados, filtrá por fecha y exportá la información para conciliación."
        actions={
          canExport ? (
            <a href={`${API_URL}/payments/export?${query.toString()}`} target="_blank" rel="noreferrer">
              <Button variant="outline">
                <Download className="h-4 w-4" /> Descargar Excel
              </Button>
            </a>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pagos vigentes"
          value={String(valid.length)}
          hint={`${payments.length - valid.length} anulados`}
          icon={Receipt}
        />
        <StatCard label="Total cobrado" value={formatCurrency(total)} icon={Receipt} tone="gold" />
        <StatCard label="En efectivo" value={formatCurrency(cash)} icon={Receipt} tone="blue" />
      </div>

      <Card className="mb-5">
        <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <Input
              className="pl-11"
              placeholder="Buscar por recibo, cliente o cobrador…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div>
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div>
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No hay pagos con ese filtro"
          description="Probá cambiando el rango de fechas o limpiando la búsqueda."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <PaginatedTable label="Pagos" className="table-base min-w-[1000px]">
              <thead>
                <tr>
                  <th>Recibo</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Préstamo</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Cobrador</th>
                  <th>Ref. externa</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((payment) => (
                  <tr key={payment.id} className={payment.voidedAt ? 'opacity-60' : undefined}>
                    <td className="font-mono text-xs font-semibold text-forest-950">
                      {payment.receiptNumber}
                    </td>
                    <td>{formatDateTime(payment.paidAt)}</td>
                    <td>
                      <p className="font-medium text-forest-950">{payment.loan?.client?.name}</p>
                      <p className="text-xs text-ink/45">
                        {payment.loan?.client?.profile?.cedula}
                      </p>
                    </td>
                    <td className="text-xs">
                      {payment.loan ? formatCurrency(payment.loan.principal) : '—'}
                    </td>
                    <td className="font-semibold text-forest-950">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td>{methodLabels[payment.method] || payment.method}</td>
                    <td>{payment.collector?.name || '—'}</td>
                    <td className="text-xs">{payment.listoRecaudoReceipt || '—'}</td>
                    <td>
                      {payment.voidedAt ? <Badge tone="red">Anulado</Badge> : <Badge tone="green">Vigente</Badge>}
                    </td>
                    <td className="text-right">
                      {payment.loan && (
                        <Link
                          to={`/admin/prestamos/${payment.loan.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:text-forest-900"
                        >
                          Ver préstamo <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </PaginatedTable>
          </div>
        </Card>
      )}

      <p className="mt-4 text-xs leading-relaxed text-ink/40">
        La descarga Excel incluye recibo, fecha, cliente, cédula, préstamo, monto, método,
        cobrador y referencia externa. Está preparada para una futura conciliación con Listo
        Recaudo.
      </p>
    </div>
  )
}
