import { Link } from 'react-router-dom'
import { PaginatedList } from '@/components/ui/Pagination'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarClock, HandCoins, Wallet } from 'lucide-react'
import { api } from '@/lib/api'
import {
  formatCurrency,
  formatDate,
  formatInstallmentCount,
  frequencyLabels,
} from '@/lib/format'
import { formatTermForFrequency } from '@/lib/loan-options'
import type { Loan } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingBlock } from '@/components/ui/Spinner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Progress } from '@/components/ui/Progress'
import { StatusBadge } from '@/components/ui/StatusBadge'

export function ClientLoansPage() {
  const loansQuery = useQuery<Loan[]>({
    queryKey: ['my-loans'],
    queryFn: async () => (await api.get('/loans/me')).data,
  })

  if (loansQuery.isLoading) return <LoadingBlock label="Cargando tus préstamos…" />
  const loans = loansQuery.data || []

  return (
    <div>
      <PageHeader
        eyebrow="Préstamos"
        title="Mis préstamos"
        description="Consultá tu plan de pagos, tu saldo y el historial de pagos registrados."
      />

      {loans.length === 0 ? (
        <EmptyState
          title="Todavía no tenés préstamos"
          description="Cuando tu solicitud sea aprobada y desembolsada, vas a ver tu plan de pagos aquí."
          action={
            <Link to="/app/solicitudes/nueva">
              <Button>Iniciar una solicitud</Button>
            </Link>
          }
        />
      ) : (
        <PaginatedList label="Mis préstamos" className="grid gap-5 lg:grid-cols-2">
          {loans.map((loan) => {
            const installments = loan.installments || []
            const paidCount = installments.filter((item) => item.paidAmount >= item.total - 0.01).length
            return (
              <Link
                key={loan.id}
                to={`/app/prestamos/${loan.id}`}
                className="group rounded-3xl border border-forest-900/10 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-forest-300 hover:shadow-soft sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-forest-50 text-forest-700">
                        <Wallet className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-display text-xl font-semibold text-forest-950">
                          {formatCurrency(loan.principal)}
                        </p>
                        <p className="text-xs text-ink/45">
                          {formatTermForFrequency(loan.termWeeks, loan.paymentFrequency)} ·{' '}
                          {formatInstallmentCount(loan.termInstallments)} ·{' '}
                          {frequencyLabels[loan.paymentFrequency]}
                        </p>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={loan.status} />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-forest-50/60 p-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-ink/40">Saldo pendiente</p>
                    <p className="mt-0.5 font-semibold text-forest-950">{formatCurrency(loan.balance)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-ink/40">Total pagado</p>
                    <p className="mt-0.5 font-semibold text-forest-950">{formatCurrency(loan.paidAmount)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-ink/40">Próximo pago</p>
                    <p className="mt-0.5 flex items-center gap-1 font-semibold text-forest-950">
                      <CalendarClock className="h-3.5 w-3.5 text-forest-500" />
                      {formatDate(loan.nextDueDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-ink/40">Cobrador</p>
                    <p className="mt-0.5 truncate font-semibold text-forest-950">
                      {loan.assignedCollector?.name || 'Por asignar'}
                    </p>
                  </div>
                </div>

                {Number(loan.overdueAmount) > 0 && (
                  <div className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">
                    {formatCurrency(loan.overdueAmount)} en cuotas vencidas
                  </div>
                )}

                <div className="mt-4 flex items-center gap-3">
                  <Progress value={paidCount} max={installments.length || 1} />
                  <span className="shrink-0 text-xs text-ink/45">
                    {paidCount}/{installments.length} cuotas
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs text-ink/45">
                    <HandCoins className="h-3.5 w-3.5" />
                    {installments.length ? `${installments.length - paidCount} cuotas por pagar` : 'Sin plan'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700">
                    Ver detalle <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            )
          })}
        </PaginatedList>
      )}
    </div>
  )
}
