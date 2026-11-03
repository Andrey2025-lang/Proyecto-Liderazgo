import { useEffect, useState } from 'react'
import { PaginatedTable } from '@/components/ui/Pagination'
import { PrintHeading } from '@/components/PrintHeading'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Download,
  HandCoins,
  Printer,
  ReceiptText,
  UserRound,
  Wallet,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { API_URL, api, apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatInstallments,
  frequencyLabels,
  isoDate,
  methodLabels,
} from '@/lib/format'
import { formatTermForFrequency } from '@/lib/loan-options'
import type { Loan, User } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingBlock } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Progress } from '@/components/ui/Progress'
import { RenewalSummary } from '@/components/RenewalSummary'

export function AdminLoanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [collectorId, setCollectorId] = useState('')
  const [disburseOpen, setDisburseOpen] = useState(false)
  const [disburseForm, setDisburseForm] = useState({
    listoRecaudoLoanId: '',
    assignedCollectorId: '',
  })
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paidAt: isoDate(new Date()),
    method: 'CASH',
    listoRecaudoReceipt: '',
    notes: '',
  })
  const [voidPaymentId, setVoidPaymentId] = useState<string | null>(null)
  const [voidReason, setVoidReason] = useState('')

  const loanQuery = useQuery<Loan>({
    queryKey: ['admin-loan', id],
    queryFn: async () => (await api.get(`/loans/${id}`)).data,
    enabled: Boolean(id),
  })
  const collectorsQuery = useQuery<User[]>({
    queryKey: ['collectors'],
    queryFn: async () => (await api.get('/users/collectors')).data,
    enabled: user?.role === 'ADMIN' || user?.role === 'SUPERVISOR',
  })
  const sourceId = loanQuery.data?.application?.renewalOfLoanId
  const sourceQuery = useQuery<Loan>({ queryKey: ['renewal-source', sourceId], queryFn: async () => (await api.get(`/loans/${sourceId}`)).data, enabled: Boolean(sourceId && loanQuery.data?.status === 'PENDING_DISBURSEMENT') })

  useEffect(() => {
    if (loanQuery.data) {
      setCollectorId(loanQuery.data.assignedCollectorId || '')
    }
  }, [loanQuery.data])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-loan', id] })
    queryClient.invalidateQueries({ queryKey: ['admin-loans'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
    queryClient.invalidateQueries({ queryKey: ['renewal-source'] })
    queryClient.invalidateQueries({ queryKey: ['renewal-history'] })
    queryClient.invalidateQueries({ queryKey: ['my-loans'] })
  }

  const disburseMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/loans/${id}/disburse`, {
          listoRecaudoLoanId: disburseForm.listoRecaudoLoanId || undefined,
          assignedCollectorId: disburseForm.assignedCollectorId || undefined,
          expectedRenewalPayoff: sourceId ? sourceQuery.data?.balance : undefined,
        })
      ).data,
    onSuccess: () => {
      invalidate()
      setDisburseOpen(false)
      toast.success('Préstamo desembolsado.')
    },
    onError: (error) => { queryClient.invalidateQueries({ queryKey: ['renewal-source'] }); toast.error(apiErrorMessage(error)) },
  })

  const assignMutation = useMutation({
    mutationFn: async () =>
      (await api.patch(`/loans/${id}/assign`, { collectorId: collectorId || null })).data,
    onSuccess: () => {
      invalidate()
      toast.success('Cobrador actualizado.')
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const paymentMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/loans/${id}/payments`, {
          amount: Number(paymentForm.amount),
          paidAt: paymentForm.paidAt,
          method: paymentForm.method,
          listoRecaudoReceipt: paymentForm.listoRecaudoReceipt || undefined,
          notes: paymentForm.notes || undefined,
        })
      ).data,
    onSuccess: () => {
      invalidate()
      setPaymentOpen(false)
      toast.success('Pago registrado y aplicado a las cuotas.')
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const voidMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/payments/${voidPaymentId}/void`, { reason: voidReason })).data,
    onSuccess: () => {
      invalidate()
      setVoidPaymentId(null)
      setVoidReason('')
      toast.success('Pago anulado. El saldo fue recalculado.')
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  if (loanQuery.isLoading) return <LoadingBlock label="Cargando el préstamo…" />
  if (loanQuery.isError || !loanQuery.data) {
    return (
      <EmptyState
        title="No encontramos ese préstamo"
        description="El enlace puede ser incorrecto o el préstamo no está disponible."
        action={
          <Link to="/admin/prestamos">
            <Button>Volver a préstamos</Button>
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
  const outstanding = installments.reduce(
    (sum, item) => sum + Math.max(0, item.total - item.paidAmount),
    0,
  )
  const canManage = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR'
  const canPay = ['ADMIN', 'SUPERVISOR', 'COLLECTOR'].includes(user?.role || '')
  const isActive = ['ACTIVE', 'DEFAULTED'].includes(loan.status)

  const openPayment = () => {
    setPaymentForm({
      amount: nextInstallment
        ? Math.round((nextInstallment.total - nextInstallment.paidAmount) * 100) / 100
        : Math.round(outstanding * 100) / 100,
      paidAt: isoDate(new Date()),
      method: 'CASH',
      listoRecaudoReceipt: '',
      notes: '',
    })
    setPaymentOpen(true)
  }

  const openDisburse = () => {
    if (sourceId) sourceQuery.refetch()
    setDisburseForm({
      listoRecaudoLoanId: loan.listoRecaudoLoanId || '',
      assignedCollectorId: loan.assignedCollectorId || '',
    })
    setDisburseOpen(true)
  }

  return (
    <div>
      <PrintHeading title="Estado de cuenta y plan de pagos" reference={`PRE-${loan.id.slice(-6).toUpperCase()}`} client={loan.client?.name} />
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/prestamos"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700 hover:text-forest-900"
        >
          <ArrowLeft className="h-4 w-4" /> Préstamos
        </Link>
        <div className="flex flex-wrap items-center gap-2">
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
              {loan.client?.name} · {formatTermForFrequency(loan.termWeeks, loan.paymentFrequency)} ·{' '}
              {formatInstallments(loan.termInstallments, loan.paymentFrequency)} · Interés total{' '}
              {loan.annualRate}%
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage && loan.status === 'PENDING_DISBURSEMENT' && (
              <Button onClick={openDisburse}>
                <Banknote className="h-4 w-4" /> Desembolsar
              </Button>
            )}
            {canPay && isActive && (
              <Button onClick={openPayment}>
                <HandCoins className="h-4 w-4" /> Registrar pago
              </Button>
            )}
            {loan.client && (
              <Link to={`/admin/clientes/${loan.client.id}`}>
                <Button variant="outline">
                  <UserRound className="h-4 w-4" /> Ver cliente
                </Button>
              </Link>
            )}
          </div>
        </div>

        {loan.status === 'PENDING_DISBURSEMENT' && (
          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            El préstamo está aprobado y pendiente de desembolso. Al confirmar, el cliente recibirá
            una notificación y podrá consultar su plan de pagos.
          </div>
        )}
        {Number(loan.overdueAmount) > 0 && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Cuotas vencidas</p>
            <p className="mt-1">
              {formatCurrency(loan.overdueAmount)} en {loan.overdueCount} cuotas requieren
              seguimiento.
            </p>
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <Progress value={paidCount} max={installments.length || 1} />
          <span className="shrink-0 text-xs font-medium text-ink/45">
            {paidCount}/{installments.length} cuotas pagadas
          </span>
        </div>
      </div>

      {sourceId && <RenewalSummary amount={loan.principal} balance={loan.disbursedAt ? loan.renewalPayoff || 0 : sourceQuery.data?.balance ?? loan.renewalPayoff ?? 0} rate={loan.annualRate} estimated={!loan.disbursedAt} />}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Monto original" value={formatCurrency(loan.principal)} icon={Wallet} />
        <StatCard label="Saldo pendiente" value={formatCurrency(loan.balance)} icon={HandCoins} tone="gold" />
        <StatCard label="Total pagado" value={formatCurrency(loan.paidAmount)} icon={CheckCircle2} tone="blue" />
        <StatCard
          label="Próximo vencimiento"
          value={formatDate(loan.nextDueDate)}
          hint={nextInstallment ? formatCurrency(nextInstallment.total - nextInstallment.paidAmount) : 'Al día'}
          icon={CalendarClock}
          tone={Number(loan.overdueAmount) > 0 ? 'red' : 'green'}
        />
      </div>

      <div className="mt-6 grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.45fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Plan de pagos" description="Aplicación de pagos por cuota." />
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
                    <tr key={installment.id} className={installment.status === 'OVERDUE' ? 'bg-red-50/40' : undefined}>
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

          <Card>
            <CardHeader
              title="Pagos"
              description="Historial de pagos del préstamo."
              action={
                <span className="rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-700">
                  {payments.length}
                </span>
              }
            />
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
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-ink/40">
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
                      <td>
                        {payment.voidedAt ? (
                          <Badge tone="red">Anulado</Badge>
                        ) : (
                          <Badge tone="green">Vigente</Badge>
                        )}
                      </td>
                      <td className="text-right">
                        {user?.role === 'ADMIN' && !payment.voidedAt && !payment.refinancingLoanId && loan.status !== 'REFINANCED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setVoidReason('')
                              setVoidPaymentId(payment.id)
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </PaginatedTable>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Datos del crédito" />
            <CardContent className="credit-facts space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-ink/45">Cliente</span>
                <span className="text-right font-semibold text-forest-950">{loan.client?.name}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink/45">Cédula</span>
                <span className="font-semibold text-forest-950">{loan.client?.profile?.cedula}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink/45">Frecuencia</span>
                <span className="font-semibold text-forest-950">{frequencyLabels[loan.paymentFrequency]}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink/45">Interés total</span>
                <span className="font-semibold text-forest-950">{loan.annualRate}%</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink/45">Primer vencimiento</span>
                <span className="font-semibold text-forest-950">{formatDate(loan.firstDueDate)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink/45">Desembolso</span>
                <span className="font-semibold text-forest-950">{formatDate(loan.disbursedAt)}</span>
              </div>
              {loan.listoRecaudoLoanId && (
                <div className="flex justify-between gap-3 border-t border-forest-900/10 pt-3">
                  <span className="text-ink/45">Ref. Listo Recaudo</span>
                  <span className="font-mono text-xs font-semibold text-forest-950">
                    {loan.listoRecaudoLoanId}
                  </span>
                </div>
              )}
              {loan.application && (
                <Link
                  to={`/admin/solicitudes/${loan.application.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:text-forest-900"
                >
                  Ver solicitud original
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Cobrador" description="Responsable del seguimiento." />
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-forest-50 p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest-900 text-cream">
                  <UserRound className="h-5 w-5" />
                </span>
                <div className="min-w-0 break-words">
                  <p className="text-sm font-semibold text-forest-950">
                    {loan.assignedCollector?.name || 'Sin asignar'}
                  </p>
                  <p className="text-xs text-ink/45">
                    {loan.assignedCollector?.phone || 'Sin teléfono'}
                  </p>
                </div>
              </div>
              {canManage && (
                <div className="space-y-2">
                  <Label htmlFor="loan-collector">Asignar cobrador</Label>
                  <Select
                    id="loan-collector"
                    value={collectorId}
                    onChange={(event) => setCollectorId(event.target.value)}
                  >
                    <option value="">Sin asignar</option>
                    {(collectorsQuery.data || []).map((collector) => (
                      <option key={collector.id} value={collector.id}>
                        {collector.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => assignMutation.mutate()}
                    loading={assignMutation.isPending}
                  >
                    Guardar asignación
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="rounded-3xl bg-forest-950 p-5 text-cream">
            <ReceiptText className="h-6 w-6 text-gold" />
            <p className="mt-3 font-display text-xl font-semibold">Registro de pagos</p>
            <p className="mt-1 text-sm leading-relaxed text-cream/60">
              Cada pago se aplica a las cuotas pendientes en orden. Si un pago se registra por
              error, el administrador puede anularlo con motivo y auditoría.
            </p>
          </div>
        </div>
      </div>

      <Modal
        open={disburseOpen}
        onClose={() => setDisburseOpen(false)}
        title="Desembolsar préstamo"
        description="Confirmá los datos del desembolso. Esta acción activa el plan de pagos."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDisburseOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => disburseMutation.mutate()} loading={disburseMutation.isPending} disabled={Boolean(sourceId && (!sourceQuery.data || sourceQuery.isFetching || sourceQuery.isError))}>
              Confirmar desembolso
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            {sourceId && <RenewalSummary amount={loan.principal} balance={sourceQuery.data?.balance ?? loan.renewalPayoff ?? 0} rate={loan.annualRate} />}
            <Label htmlFor="listo-recaudo">Referencia Listo Recaudo (opcional)</Label>
            <Input
              id="listo-recaudo"
              value={disburseForm.listoRecaudoLoanId}
              onChange={(event) =>
                setDisburseForm((current) => ({
                  ...current,
                  listoRecaudoLoanId: event.target.value,
                }))
              }
              placeholder="LR-2026-0001"
            />
            <p className="mt-1 text-[11px] text-ink/40">
              Como no hay API disponible, se guarda como referencia manual.
            </p>
          </div>
          <div>
            <Label htmlFor="disburse-collector">Cobrador asignado</Label>
            <Select
              id="disburse-collector"
              value={disburseForm.assignedCollectorId}
              onChange={(event) =>
                setDisburseForm((current) => ({
                  ...current,
                  assignedCollectorId: event.target.value,
                }))
              }
            >
              <option value="">Sin asignar</option>
              {(collectorsQuery.data || []).map((collector) => (
                <option key={collector.id} value={collector.id}>
                  {collector.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="rounded-2xl bg-forest-50 p-4 text-sm text-forest-900">
            <p className="font-semibold">Al confirmar</p>
            <ul className="mt-2 space-y-1 text-xs text-forest-700">
              <li>• El préstamo pasa a estado activo.</li>
              <li>• Se registra la fecha de desembolso.</li>
              <li>• El cliente recibe una notificación en su portal.</li>
            </ul>
          </div>
        </div>
      </Modal>

      <Modal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Registrar pago"
        description="El pago se aplicará a las cuotas pendientes en orden."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPaymentOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => paymentMutation.mutate()}
              loading={paymentMutation.isPending}
              disabled={!paymentForm.amount || paymentForm.amount <= 0}
            >
              Registrar pago
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="payment-amount">Monto (₡)</Label>
            <Input
              id="payment-amount"
              type="number"
              min={1}
              step={100}
              value={paymentForm.amount}
              onChange={(event) =>
                setPaymentForm((current) => ({ ...current, amount: Number(event.target.value) }))
              }
            />
            <p className="mt-1 text-[11px] text-ink/40">
              Saldo pendiente: {formatCurrency(outstanding)}
            </p>
          </div>
          <div>
            <Label htmlFor="payment-date">Fecha del pago</Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentForm.paidAt}
              onChange={(event) =>
                setPaymentForm((current) => ({ ...current, paidAt: event.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="payment-method">Método</Label>
            <Select
              id="payment-method"
              value={paymentForm.method}
              onChange={(event) =>
                setPaymentForm((current) => ({ ...current, method: event.target.value }))
              }
            >
              {Object.entries(methodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="payment-receipt">Recibo / referencia externa</Label>
            <Input
              id="payment-receipt"
              value={paymentForm.listoRecaudoReceipt}
              onChange={(event) =>
                setPaymentForm((current) => ({
                  ...current,
                  listoRecaudoReceipt: event.target.value,
                }))
              }
              placeholder="LR-000123 o referencia bancaria"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="payment-notes">Notas</Label>
            <Textarea
              id="payment-notes"
              value={paymentForm.notes}
              onChange={(event) =>
                setPaymentForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Observaciones del pago."
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(voidPaymentId)}
        onClose={() => setVoidPaymentId(null)}
        title="Anular pago"
        description="El saldo y las cuotas se recalcularán. La acción queda en auditoría."
        footer={
          <>
            <Button variant="ghost" onClick={() => setVoidPaymentId(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => voidMutation.mutate()}
              loading={voidMutation.isPending}
              disabled={voidReason.trim().length < 5}
            >
              Anular pago
            </Button>
          </>
        }
      >
        <div>
          <Label htmlFor="void-reason">Motivo de la anulación</Label>
          <Textarea
            id="void-reason"
            value={voidReason}
            onChange={(event) => setVoidReason(event.target.value)}
            placeholder="Ej. Pago registrado duplicado."
          />
        </div>
      </Modal>
    </div>
  )
}
