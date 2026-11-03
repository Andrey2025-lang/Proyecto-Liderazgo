import { useState } from 'react'
import { PaginatedTable } from '@/components/ui/Pagination'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Search, Wallet } from 'lucide-react'
import { api } from '@/lib/api'
import {
  formatCurrency,
  formatDate,
  formatInstallmentCount,
  frequencyLabels,
} from '@/lib/format'
import { formatTermForFrequency } from '@/lib/loan-options'
import type { Loan } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingBlock } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING_DISBURSEMENT', label: 'Pendientes de desembolso' },
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'DEFAULTED', label: 'En mora' },
  { value: 'PAID', label: 'Pagados' },
]

export function AdminLoansPage() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const loansQuery = useQuery<Loan[]>({
    queryKey: ['admin-loans', status, search],
    queryFn: async () =>
      (
        await api.get('/loans', {
          params: { status: status || undefined, search: search || undefined },
        })
      ).data,
  })

  if (loansQuery.isLoading) return <LoadingBlock label="Cargando préstamos…" />
  const loans = loansQuery.data || []
  const active = loans.filter((loan) => ['ACTIVE', 'DEFAULTED'].includes(loan.status))
  const portfolio = active.reduce((sum, loan) => sum + (loan.balance || 0), 0)
  const overdue = active.reduce((sum, loan) => sum + Number(loan.overdueAmount || 0), 0)

  return (
    <div>
      <PageHeader
        eyebrow="Cartera"
        title="Préstamos"
        description="Gestioná desembolsos, asignaciones, planes de pago y cobros."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Préstamos activos" value={String(active.length)} icon={Wallet} />
        <StatCard label="Saldo en cartera" value={formatCurrency(portfolio)} icon={Wallet} tone="gold" />
        <StatCard
          label="Monto vencido"
          value={formatCurrency(overdue)}
          hint="Cuotas con atraso"
          icon={Wallet}
          tone={overdue > 0 ? 'red' : 'green'}
        />
      </div>

      <Card className="mb-5">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <Input
              className="pl-11"
              placeholder="Buscar por cliente, correo o cédula…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="sm:w-64">
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {loans.length === 0 ? (
        <EmptyState
          title="No hay préstamos con ese filtro"
          description="Probá con otro estado o limpiá la búsqueda."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <PaginatedTable label="Préstamos" className="table-base min-w-[980px]">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Monto</th>
                  <th>Saldo</th>
                  <th>Plan</th>
                  <th>Próximo pago</th>
                  <th>Cobrador</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan.id}>
                    <td>
                      <div>
                        <p className="font-semibold text-forest-950">{loan.client?.name}</p>
                        <p className="text-xs text-ink/45">
                          {loan.client?.profile?.cedula} ·{' '}
                          {loan.client?.profile?.community || 'Sin comunidad'}
                        </p>
                      </div>
                    </td>
                    <td className="font-semibold text-forest-950">
                      {formatCurrency(loan.principal)}
                    </td>
                    <td>
                      {formatCurrency(loan.balance)}
                      {Number(loan.overdueAmount) > 0 && (
                        <p className="text-xs font-medium text-red-600">
                          {formatCurrency(loan.overdueAmount)} vencido
                        </p>
                      )}
                    </td>
                    <td>
                      <p>
                        {formatTermForFrequency(loan.termWeeks, loan.paymentFrequency)} ·{' '}
                        {formatInstallmentCount(loan.termInstallments)}
                      </p>
                      <p className="text-xs text-ink/45">
                        {frequencyLabels[loan.paymentFrequency]} · Interés {loan.annualRate}%
                      </p>
                    </td>
                    <td>{formatDate(loan.nextDueDate)}</td>
                    <td>{loan.assignedCollector?.name || 'Sin asignar'}</td>
                    <td>
                      <StatusBadge status={loan.status} />
                    </td>
                    <td className="text-right">
                      <Link
                        to={`/admin/prestamos/${loan.id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:text-forest-900"
                      >
                        Gestionar <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </PaginatedTable>
          </div>
        </Card>
      )}
    </div>
  )
}
