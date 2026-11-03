import { Link, useParams } from 'react-router-dom'
import { PaginatedTable } from '@/components/ui/Pagination'
import { PrintHeading } from '@/components/PrintHeading'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Download,
  HandCoins,
  Printer,
  ReceiptText,
  UserRound,
  Wallet,
} from 'lucide-react'
import { API_URL, api } from '@/lib/api'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatInstallments,
  frequencyLabels,
  methodLabels,
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
import { RenewalSummary } from '@/components/RenewalSummary'

export function ClientLoanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const applicationsQuery = useQuery<Application[]>({ queryKey: ['my-applications'], queryFn: async () => (await api.get('/applications/me')).data })
  const pendingApplication = applicationsQuery.data?.find((item) => ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'RECOMMENDED'].includes(item.status))
  const loanQuery = useQuery<Loan>({
    queryKey: ['my-loan', id],
    queryFn: async () => (await api.get(`/loans/me/${id}`)).data,
    enabled: Boolean(id),
  })

  if (loanQuery.isLoading) return <LoadingBlock label="Cargando tu préstamo…" />
  if (loanQuery.isError || !loanQuery.data) {
    return (
      <EmptyState
        title="No encontramos ese préstamo"
        description="Revisá tus préstamos activos o comunicate con el equipo."
        action={
          <Link to="/app/prestamos">
            <Button>Volver a mis préstamos</Button>
          </Link>
        }
      />
    )
  }

  const loan = loanQuery.data
  const installments = loan.installments || []
  const payments = loan.payments || []
  const paidCount = installments.filter((item) => item.paidAmount >= item.total - 0.01).length
  const nextInstallment = installments.find((item) => item.paidAmount < item.total - 0.01)

  return (
    <div>
      <PrintHeading title="Estado de cuenta y plan de pagos" reference={`PRE-${loan.id.slice(-6).toUpperCase()}`} client={user?.name} />
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/app/prestamos"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700 hover:text-forest-900"
        >
          <ArrowLeft className="h-4 w-4" /> Mis préstamos
        </Link>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {pendingApplication ? <Link to={`/app/solicitudes/${pendingApplication.id}`}><Button size="sm">Ver solicitud en proceso</Button></Link> : ['ACTIVE', 'DEFAULTED', 'PAID'].includes(loan.status) && applicationsQuery.isSuccess && <Link to={`/app/solicitudes/nueva?renovar=${loan.id}`}><Button size="sm">Solicitar renovación</Button></Link>}
          <StatusBadge status={loan.status} />
          <a href={`${API_URL}/loans/${loan.id}/export`}><Button variant="outline" size="sm"><Download className="h-4 w-4" /> Excel</Button></a>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>
      </div>

      <div className="rounded-4xl border border-forest-900/10 bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow">Préstamo #{loan.id.slice(-6).toUpperCase()}</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-forest-950">
              {formatCurrency(loan.principal)}
            </h1>
            <p className="mt-2 text-sm text-ink/50">
              {formatTermForFrequency(loan.termWeeks, loan.paymentFrequency)} ·{' '}
              {formatInstallments(loan.termInstallments, loan.paymentFrequency)} · Interés total{' '}
              {loan.annualRate}%
            </p>
          </div>
          <div className="rounded-2xl bg-forest-50 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-forest-600">Saldo pendiente</p>
            <p className="mt-0.5 font-display text-2xl font-semibold text-forest-950">
              {formatCurrency(loan.balance)}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Progress value={paidCount} max={installments.length || 1} />
          <span className="shrink-0 text-xs font-medium text-ink/45">
            {paidCount} de {installments.length} cuotas pagadas
          </span>
        </div>

        {Number(loan.overdueAmount) > 0 && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Tenés cuotas vencidas</p>
            <p className="mt-1 text-red-700/80">
              Saldo vencido: {formatCurrency(loan.overdueAmount)}. Coordiná con tu cobrador para
              ponerte al día.
            </p>
          </div>
        )}
        {loan.status === 'PENDING_DISBURSEMENT' && (
          <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            Tu préstamo fue aprobado y está pendiente de desembolso. El equipo coordinará la
            entrega.
          </div>
        )}
      </div>

      {loan.application?.renewalOfLoanId && <RenewalSummary amount={loan.principal} balance={loan.renewalPayoff || 0} rate={loan.annualRate} estimated={!loan.disbursedAt} />}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Monto original" value={formatCurrency(loan.principal)} icon={Wallet} />
        <StatCard
          label="Total pagado"
          value={formatCurrency(loan.paidAmount)}
          icon={CheckCircle2}
          tone="blue"
        />
        <StatCard
          label="Cuotas pagadas"
          value={`${paidCount}/${installments.length}`}
          icon={HandCoins}
          tone="gold"
        />
        <StatCard
          label="Próximo vencimiento"
          value={nextInstallment ? formatDate(nextInstallment.dueDate) : 'Al día'}
          hint={nextInstallment ? formatCurrency(nextInstallment.total - nextInstallment.paidAmount) : undefined}
          icon={CalendarClock}
          tone={Number(loan.overdueAmount) > 0 ? 'red' : 'green'}
        />
      </div>

      <div className="mt-6 grid min-w-0 gap-6">
        <Card>
          <CardHeader title="Plan de pagos" description="Cuotas, fechas y estado de cada pago." />
          <div className="overflow-x-auto">
            <PaginatedTable responsive label="Plan de pagos" className="table-base">
              <thead>
                <tr>
                  <th>Cuota</th>
                  <th>Vence</th>
                  <th>Capital</th>
                  <th>Interés</th>
                  <th>Total</th>
                  <th>Pagado</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((installment) => (
                  <tr key={installment.id}>
                    <td className="font-semibold text-forest-950">{installment.number}</td>
                    <td>{formatDate(installment.dueDate)}</td>
                    <td>{formatCurrency(installment.principal)}</td>
                    <td>{formatCurrency(installment.interest)}</td>
                    <td className="font-medium text-forest-950">{formatCurrency(installment.total)}</td>
                    <td>{formatCurrency(installment.paidAmount)}</td>
                    <td>
                      <StatusBadge status={installment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </PaginatedTable>
          </div>
        </Card>

        <div className="grid min-w-0 items-start gap-6 md:grid-cols-2">
          <Card>
            <CardHeader title="Datos del crédito" />
            <CardContent className="credit-facts space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-ink/45">Frecuencia</span>
                <span className="font-semibold text-forest-950">{frequencyLabels[loan.paymentFrequency]}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-ink/45">Interés total</span>
                <span className="font-semibold text-forest-950">{loan.annualRate}%</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-ink/45">Primer vencimiento</span>
                <span className="font-semibold text-forest-950">{formatDate(loan.firstDueDate)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-ink/45">Desembolso</span>
                <span className="font-semibold text-forest-950">{formatDate(loan.disbursedAt)}</span>
              </div>
              {loan.listoRecaudoLoanId && (
                <div className="flex justify-between gap-4 border-t border-forest-900/10 pt-3">
                  <span className="text-ink/45">Ref. Listo Recaudo</span>
                  <span className="font-mono text-xs font-semibold text-forest-950">
                    {loan.listoRecaudoLoanId}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Tu cobrador" />
            <CardContent>
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest-50 text-forest-700">
                  <UserRound className="h-5 w-5" />
                </span>
                <div className="min-w-0 break-words">
                  <p className="font-semibold text-forest-950">
                    {loan.assignedCollector?.name || 'Por asignar'}
                  </p>
                  <p className="text-xs text-ink/45">
                    {loan.assignedCollector?.phone || 'El equipo te contactará'}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink/45">
                Coordiná con tu cobrador el medio y la fecha de pago. Los pagos deben quedar
                registrados en el sistema para actualizar tu saldo.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader title="Historial de pagos" description="Pagos registrados en tu crédito." />
        <div className="overflow-x-auto">
          <PaginatedTable responsive label="Historial de pagos" className="table-base">
            <thead>
              <tr>
                <th>Recibo</th>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Cobrador</th>
                <th>Ref. externa</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink/40">
                    Todavía no hay pagos registrados.
                  </td>
                </tr>
              )}
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="font-mono text-xs font-semibold text-forest-950">
                    {payment.receiptNumber}
                  </td>
                  <td>{formatDateTime(payment.paidAt)}</td>
                  <td className="font-semibold text-forest-950">{formatCurrency(payment.amount)}</td>
                  <td>{methodLabels[payment.method] || payment.method}</td>
                  <td>{payment.collector?.name || '—'}</td>
                  <td className="text-xs">{payment.listoRecaudoReceipt || '—'}</td>
                </tr>
              ))}
            </tbody>
          </PaginatedTable>
        </div>
      </Card>

      <div className="mt-6 flex items-start gap-3 rounded-3xl border border-forest-900/10 bg-white p-5 text-sm text-ink/55">
        <ReceiptText className="mt-0.5 h-5 w-5 shrink-0 text-forest-600" />
        <p>
          Este plan es informativo. Si detectás un error en un pago o en tu saldo, comunicate con
          el equipo antes de realizar otro pago.
        </p>
      </div>
    </div>
  )
}
