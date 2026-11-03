import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FilePlus2,
  HandCoins,
  Wallet,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  formatCurrency,
  formatDate,
  formatInstallmentCount,
  formatInstallments,
  frequencyLabels,
} from '@/lib/format'
import { formatTermForFrequency } from '@/lib/loan-options'
import type { Application, Loan } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingBlock } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Progress } from '@/components/ui/Progress'
import { NotificationsPanel } from '@/components/NotificationsPanel'

const activeApplicationStatuses = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'INFO_REQUESTED',
  'RECOMMENDED',
]

export function ClientDashboardPage() {
  const { user } = useAuth()
  const applicationsQuery = useQuery<Application[]>({
    queryKey: ['my-applications'],
    queryFn: async () => (await api.get('/applications/me')).data,
  })
  const loansQuery = useQuery<Loan[]>({
    queryKey: ['my-loans'],
    queryFn: async () => (await api.get('/loans/me')).data,
  })

  const applications = applicationsQuery.data || []
  const loans = loansQuery.data || []
  const activeApplication = applications.find((item) =>
    activeApplicationStatuses.includes(item.status),
  )
  const activeLoans = loans.filter((loan) => ['ACTIVE', 'DEFAULTED'].includes(loan.status))
  const totalBalance = activeLoans.reduce((sum, loan) => sum + (loan.balance || 0), 0)
  const totalPaid = loans.reduce((sum, loan) => sum + (loan.paidAmount || 0), 0)
  const nextLoan = [...activeLoans].sort((a, b) => {
    if (!a.nextDueDate) return 1
    if (!b.nextDueDate) return -1
    return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()
  })[0]
  const nextInstallment = nextLoan?.installments?.find(
    (installment) => installment.paidAmount < installment.total - 0.01,
  )

  if (applicationsQuery.isLoading || loansQuery.isLoading) {
    return <LoadingBlock label="Preparando tu resumen…" />
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Tu espacio</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-forest-950 sm:text-4xl">
            Hola, {user?.name?.split(' ')[0] || 'bienvenido'}.
          </h1>
          <p className="mt-2 text-sm text-ink/55">
            Este es el resumen de tu solicitud y tus préstamos con J&C.
          </p>
        </div>
        {activeApplication ? (
          <Link to={`/app/solicitudes/${activeApplication.id}`}>
            <Button>
              Ver mi solicitud <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Link to={activeLoans[0] ? `/app/solicitudes/nueva?renovar=${activeLoans[0].id}` : '/app/solicitudes/nueva'}>
            <Button>
              <FilePlus2 className="h-4 w-4" /> {activeLoans.length ? 'Solicitar renovación' : 'Nueva solicitud'}
            </Button>
          </Link>
        )}
      </div>

      {activeApplication && (
        <Card className="mb-6 overflow-hidden border-forest-900/10 bg-gradient-to-br from-forest-950 to-forest-800 text-cream">
          <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
                  Solicitud en proceso
                </span>
                <StatusBadge status={activeApplication.status} />
              </div>
              <p className="mt-3 font-display text-2xl font-semibold">
                {formatCurrency(activeApplication.amountRequested)}
              </p>
              <p className="mt-1 text-sm text-cream/60">
                {formatTermForFrequency(activeApplication.termWeeks, activeApplication.paymentFrequency)} ·{' '}
                {formatInstallments(
                  activeApplication.termInstallments,
                  activeApplication.paymentFrequency,
                )}{' '}
                · Enviada el{' '}
                {formatDate(activeApplication.submittedAt || activeApplication.createdAt)}
              </p>
            </div>
            <Link to={`/app/solicitudes/${activeApplication.id}`}>
              <Button variant="gold">
                Ver detalle <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Préstamos activos"
          value={String(activeLoans.length)}
          hint={activeLoans.length ? 'Créditos en seguimiento' : 'Sin préstamos activos'}
          icon={Wallet}
        />
        <StatCard
          label="Saldo pendiente"
          value={formatCurrency(totalBalance)}
          hint="Suma de cuotas pendientes"
          icon={HandCoins}
          tone="gold"
        />
        <StatCard
          label="Total pagado"
          value={formatCurrency(totalPaid)}
          hint="Pagos registrados en tus préstamos"
          icon={CheckCircle2}
          tone="blue"
        />
        <StatCard
          label="Próximo pago"
          value={nextInstallment ? formatCurrency(nextInstallment.total - nextInstallment.paidAmount) : '—'}
          hint={nextInstallment ? formatDate(nextInstallment.dueDate) : 'Sin pagos pendientes'}
          icon={CalendarClock}
          tone={nextLoan?.overdueAmount ? 'red' : 'green'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader
            title="Mis préstamos"
            description="Consultá el plan de pagos y tu saldo actualizado."
            action={
              <Link to="/app/prestamos" className="text-sm font-semibold text-forest-700 hover:text-forest-900">
                Ver todos
              </Link>
            }
          />
          <CardContent>
            {loans.length === 0 ? (
              <EmptyState
                title="Todavía no tenés préstamos"
                description="Cuando tu solicitud sea aprobada y desembolsada, vas a ver tu plan de pagos aquí."
                action={
                  <Link to="/app/solicitudes/nueva">
                    <Button size="sm">Iniciar una solicitud</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {loans.slice(0, 3).map((loan) => {
                  const installments = loan.installments || []
                  const paidCount = installments.filter(
                    (item) => item.paidAmount >= item.total - 0.01,
                  ).length
                  return (
                    <Link
                      key={loan.id}
                      to={`/app/prestamos/${loan.id}`}
                      className="block rounded-2xl border border-forest-900/10 p-4 transition hover:border-forest-300 hover:bg-forest-50/50"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-display text-lg font-semibold text-forest-950">
                              {formatCurrency(loan.principal)}
                            </p>
                            <StatusBadge status={loan.status} />
                          </div>
                          <p className="mt-1 text-xs text-ink/50">
                            {formatTermForFrequency(loan.termWeeks, loan.paymentFrequency)} ·{' '}
                            {formatInstallmentCount(loan.termInstallments)} ·{' '}
                            {frequencyLabels[loan.paymentFrequency]}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-ink/45">Saldo</p>
                          <p className="font-semibold text-forest-950">{formatCurrency(loan.balance)}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <Progress value={paidCount} max={installments.length || 1} />
                        <span className="shrink-0 text-xs text-ink/45">
                          {paidCount}/{installments.length}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Solicitudes recientes"
            description="El estado de tus solicitudes."
            action={
              <Link to="/app/solicitudes" className="text-sm font-semibold text-forest-700 hover:text-forest-900">
                Ver todas
              </Link>
            }
          />
          <CardContent>
            {applications.length === 0 ? (
              <EmptyState
                title="Sin solicitudes"
                description="Completá tu primera solicitud para empezar."
                action={
                  <Link to="/app/solicitudes/nueva">
                    <Button size="sm">Solicitar ahora</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {applications.slice(0, 4).map((application) => (
                  <Link
                    key={application.id}
                    to={`/app/solicitudes/${application.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-forest-900/10 p-3 transition hover:border-forest-300 hover:bg-forest-50/50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-forest-950">
                        {formatCurrency(application.amountRequested)}
                      </p>
                      <p className="mt-0.5 text-xs text-ink/45">
                        {formatDate(application.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={application.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {nextLoan && nextInstallment && (
        <Card className="mt-6">
          <CardHeader
            title="Tu próximo pago"
            description={`Préstamo ${formatCurrency(nextLoan.principal)} · ${frequencyLabels[nextLoan.paymentFrequency]}`}
          />
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-forest-50 text-forest-700">
                <CalendarClock className="h-6 w-6" />
              </span>
              <div>
                <p className="font-display text-2xl font-semibold text-forest-950">
                  {formatCurrency(nextInstallment.total - nextInstallment.paidAmount)}
                </p>
                <p className="text-sm text-ink/50">
                  Vence el {formatDate(nextInstallment.dueDate)} · Cuota {nextInstallment.number}
                </p>
              </div>
            </div>
            {nextLoan.overdueAmount ? (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                Tenés {formatCurrency(nextLoan.overdueAmount)} en cuotas vencidas.
              </div>
            ) : (
              <div className="rounded-2xl bg-forest-50 px-4 py-3 text-sm text-forest-700">
                Tu crédito está al día. ¡Gracias!
              </div>
            )}
            <Link to={`/app/prestamos/${nextLoan.id}`}>
              <Button variant="outline">Ver plan de pagos</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="mt-6">
        <NotificationsPanel />
      </div>
    </div>
  )
}
