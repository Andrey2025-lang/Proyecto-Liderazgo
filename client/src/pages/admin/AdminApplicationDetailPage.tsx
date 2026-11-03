import { useState } from 'react'
import { PaginatedList } from '@/components/ui/Pagination'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  Wallet,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { API_URL, api, apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  addDays,
  documentTypeLabels,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatInstallmentCount,
  formatInstallments,
  frequencyLabels,
  isoDate,
} from '@/lib/format'
import {
  LOAN_AMOUNTS,
  adjustTermForFrequency,
  installmentsForTermWeeks,
  termWeeksForInstallments,
  formatTermForFrequency,
  termsForFrequency,
} from '@/lib/loan-options'
import type { Application, User, Loan, Settings } from '@/lib/types'
import { RenewalSummary } from '@/components/RenewalSummary'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingBlock } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'

export function AdminApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [reviewOpen, setReviewOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reviewStatus, setReviewStatus] = useState('UNDER_REVIEW')
  const [reviewNotes, setReviewNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [approveForm, setApproveForm] = useState({
    approvedAmount: 0,
    annualRate: 5,
    termWeeks: 8,
    paymentFrequency: 'WEEKLY',
    firstDueDate: '',
    assignedCollectorId: '',
  })

  const applicationQuery = useQuery<Application>({
    queryKey: ['admin-application', id],
    queryFn: async () => (await api.get(`/applications/${id}`)).data,
    enabled: Boolean(id),
  })
  const collectorsQuery = useQuery<User[]>({
    queryKey: ['collectors'],
    queryFn: async () => (await api.get('/users/collectors')).data,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-application', id] })
    queryClient.invalidateQueries({ queryKey: ['admin-applications'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const settingsQuery = useQuery<Settings>({ queryKey: ['public-settings'], queryFn: async () => (await api.get('/public/settings')).data })
  const historyQuery = useQuery<User & { clientLoans: Loan[] }>({
    queryKey: ['renewal-history', applicationQuery.data?.clientId],
    queryFn: async () => (await api.get(`/clients/${applicationQuery.data?.clientId}`)).data,
    enabled: Boolean(applicationQuery.data?.clientId),
  })

  const reviewMutation = useMutation({
    mutationFn: async () =>
      (
        await api.patch(`/applications/${id}/review`, {
          status: reviewStatus,
          notes: reviewNotes || undefined,
        })
      ).data,
    onSuccess: () => {
      invalidate()
      setReviewOpen(false)
      toast.success(
        reviewStatus === 'INFO_REQUESTED'
          ? 'Se solicitó información al cliente.'
          : 'Solicitud marcada en revisión.',
      )
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const approveMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/applications/${id}/approve`, {
          approvedAmount: Number(approveForm.approvedAmount),
          annualRate: Number(approveForm.annualRate),
          termWeeks: approveForm.termWeeks,
          termInstallments: installmentsForTermWeeks(
            approveForm.termWeeks,
            approveForm.paymentFrequency,
          ),
          paymentFrequency: approveForm.paymentFrequency,
          firstDueDate: approveForm.firstDueDate,
          assignedCollectorId: approveForm.assignedCollectorId || undefined,
        })
      ).data,
    onSuccess: () => {
      invalidate()
      setApproveOpen(false)
      toast.success('Solicitud aprobada y préstamo creado.')
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const rejectMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/applications/${id}/reject`, { reason: rejectReason })).data,
    onSuccess: () => {
      invalidate()
      setRejectOpen(false)
      toast.success('Solicitud rechazada y cliente notificado.')
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  if (applicationQuery.isLoading) return <LoadingBlock label="Cargando la solicitud…" />
  if (applicationQuery.isError || !applicationQuery.data) {
    return (
      <EmptyState
        title="No encontramos esa solicitud"
        description="Puede que haya sido eliminada o que el enlace sea incorrecto."
        action={
          <Link to="/admin/solicitudes">
            <Button>Volver a solicitudes</Button>
          </Link>
        }
      />
    )
  }

  const application = applicationQuery.data
  const client = application.client
  const loan = application.loan
  const canReview = ['SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED'].includes(application.status)
  const canDecide = ['SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'RECOMMENDED'].includes(
    application.status,
  )
  const isAdmin = user?.role === 'ADMIN'
  const sourceLoan = historyQuery.data?.clientLoans.find((item) => item.id === application.renewalOfLoanId)
  const loanAmounts = settingsQuery.data?.loanAmounts || [...LOAN_AMOUNTS]

  const openReview = (status: string) => {
    setReviewStatus(status)
    setReviewNotes(application.reviewNotes || '')
    setReviewOpen(true)
  }

  const openApprove = () => {
    const frequency = application.approvedFrequency || application.paymentFrequency
    const firstDueDays = frequency === 'WEEKLY' ? 7 : frequency === 'BIWEEKLY' ? 14 : 30
    const suggestedTerm =
      application.approvedTermWeeks ||
      application.termWeeks ||
      termWeeksForInstallments(
        application.approvedTerm || application.termInstallments,
        frequency,
      )
    setApproveForm({
      approvedAmount: application.approvedAmount || application.amountRequested,
      annualRate: application.annualRate ?? settingsQuery.data?.annualRate ?? 5,
      termWeeks: adjustTermForFrequency(suggestedTerm, frequency, settingsQuery.data),
      paymentFrequency: frequency,
      firstDueDate: isoDate(addDays(new Date(), firstDueDays)),
      assignedCollectorId: client?.profile?.assignedCollectorId || '',
    })
    setApproveOpen(true)
  }

  const openReject = () => {
    setRejectReason('')
    setRejectOpen(true)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/solicitudes"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700 hover:text-forest-900"
        >
          <ArrowLeft className="h-4 w-4" /> Bandeja de solicitudes
        </Link>
        <StatusBadge status={application.status} />
      </div>

      <div className="rounded-4xl border border-forest-900/10 bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow">Solicitud #{application.id.slice(-6).toUpperCase()}</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-forest-950">
              {formatCurrency(application.amountRequested)}
            </h1>
            <p className="mt-2 text-sm text-ink/50">
              {client?.name} ·{' '}
              {formatTermForFrequency(
                application.termWeeks ||
                  termWeeksForInstallments(
                    application.termInstallments,
                    application.paymentFrequency,
                  ),
                application.paymentFrequency,
              )}{' '}
              ·{' '}
              {formatInstallments(
                application.termInstallments,
                application.paymentFrequency,
              )}{' '}
              · {formatDate(application.submittedAt || application.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canReview && (
              <>
                <Button variant="outline" onClick={() => openReview('UNDER_REVIEW')}>
                  Marcar en revisión
                </Button>
                <Button variant="secondary" onClick={() => openReview('INFO_REQUESTED')}>
                  Solicitar información
                </Button>
              </>
            )}
            {isAdmin && canDecide && (
              <>
                <Button onClick={openApprove}>
                  <ThumbsUp className="h-4 w-4" /> Aprobar
                </Button>
                <Button variant="danger" onClick={openReject}>
                  <ThumbsDown className="h-4 w-4" /> Rechazar
                </Button>
              </>
            )}
            {loan && (
              <Link to={`/admin/prestamos/${loan.id}`}>
                <Button variant="gold">
                  <Wallet className="h-4 w-4" /> Ver préstamo
                </Button>
              </Link>
            )}
          </div>
        </div>

        {application.reviewNotes && (
          <div className="mt-5 rounded-2xl bg-forest-50 p-4 text-sm text-forest-900">
            <p className="text-xs font-bold uppercase tracking-wide text-forest-600">Nota de revisión</p>
            <p className="mt-1 leading-relaxed">{application.reviewNotes}</p>
            {application.reviewedBy && (
              <p className="mt-1 text-xs text-ink/40">Por {application.reviewedBy.name}</p>
            )}
          </div>
        )}
        {application.status === 'REJECTED' && application.rejectionReason && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Motivo del rechazo</p>
            <p className="mt-1">{application.rejectionReason}</p>
          </div>
        )}
      </div>

      {application.renewalOfLoanId && <>
        <RenewalSummary amount={loan?.principal || application.amountRequested} balance={loan?.disbursedAt ? loan.renewalPayoff || 0 : sourceLoan?.balance || 0} rate={loan?.annualRate ?? settingsQuery.data?.annualRate ?? 5} estimated={!loan?.disbursedAt} />
        <Card className="mb-6"><CardHeader title="Historial para evaluar la renovación" description="La decisión es manual: revisá préstamos, saldos, atrasos y pagos antes de aprobar." /><CardContent>
          {historyQuery.isLoading ? <p>Cargando historial…</p> : historyQuery.isError ? <p role="alert" className="text-red-700">No se pudo cargar el historial. No apruebes sin revisarlo.</p> : <PaginatedList label="Historial para renovación">{historyQuery.data?.clientLoans.map((item) => <Link key={item.id} to={`/admin/prestamos/${item.id}`} className="block rounded-2xl bg-forest-50 p-3 text-sm"><strong>#{item.id.slice(-6).toUpperCase()} · {formatCurrency(item.principal)}</strong><p>{formatDate(item.startDate)} · Saldo {formatCurrency(item.balance)} · Vencido {formatCurrency(item.overdueAmount)}</p><StatusBadge status={item.status} /></Link>)}</PaginatedList>}
        </CardContent></Card>
      </>}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Datos del cliente" description="Información registrada en el perfil." />
            <CardContent>
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-forest-900 text-xl font-bold text-cream">
                  {client?.name?.charAt(0) || 'C'}
                </span>
                <div>
                  <p className="font-display text-xl font-semibold text-forest-950">{client?.name}</p>
                  <p className="text-sm text-ink/45">{client?.profile?.cedula}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2 text-sm text-ink/65">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" /> {client?.email}
                </div>
                <div className="flex items-start gap-2 text-sm text-ink/65">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />{' '}
                  {client?.phone || 'Sin teléfono'}
                </div>
                <div className="flex items-start gap-2 text-sm text-ink/65">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />{' '}
                  {client?.profile?.community || 'Sin comunidad'} ·{' '}
                  {client?.profile?.address || 'Sin dirección'}
                </div>
                <div className="flex items-start gap-2 text-sm text-ink/65">
                  <BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />{' '}
                  {client?.profile?.occupation || 'Sin ocupación'} ·{' '}
                  {client?.profile?.employer || 'Sin empleador'}
                </div>
                <div className="flex items-start gap-2 text-sm text-ink/65">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" /> Inicio de
                  actividad: {formatDate(client?.profile?.employmentStartDate)}
                </div>
                <div className="flex items-start gap-2 text-sm text-ink/65">
                  <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" /> Ingreso mensual:{' '}
                  {formatCurrency(client?.profile?.monthlyIncome)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Detalle de la solicitud" />
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-forest-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-forest-600">
                    Monto solicitado
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold text-forest-950">
                    {formatCurrency(application.amountRequested)}
                  </p>
                </div>
                <div className="rounded-2xl bg-forest-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-forest-600">
                    Cuota estimada
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold text-forest-950">
                    {loan?.installments?.[0]?.total
                      ? formatCurrency(loan.installments[0].total)
                      : 'Por calcular'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink/40">Plazo</p>
                  <p className="mt-1 text-sm font-semibold text-forest-950">
                    {formatTermForFrequency(
                      application.termWeeks ||
                        termWeeksForInstallments(
                          application.termInstallments,
                          application.paymentFrequency,
                        ),
                      application.paymentFrequency,
                    )}{' '}
                    · {formatInstallmentCount(application.termInstallments)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink/40">Frecuencia</p>
                  <p className="mt-1 text-sm font-semibold text-forest-950">
                    {frequencyLabels[application.paymentFrequency]}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink/40">Enviada</p>
                  <p className="mt-1 text-sm font-semibold text-forest-950">
                    {formatDateTime(application.submittedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink/40">Decisión</p>
                  <p className="mt-1 text-sm font-semibold text-forest-950">
                    {formatDateTime(application.decisionAt)}
                  </p>
                </div>
                {application.purpose && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-ink/40">Propósito</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink/70">{application.purpose}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Documentos"
              description="Archivos adjuntos por el cliente."
              action={
                <span className="rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-700">
                  {application.documents?.length || 0}
                </span>
              }
            />
            <CardContent>
              {application.documents?.length ? (
                <PaginatedList label="Documentos de la solicitud" className="space-y-2">
                  {application.documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-forest-900/10 p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700">
                          <FileText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-forest-950">
                            {document.originalName}
                          </p>
                          <p className="text-[11px] text-ink/40">
                            {documentTypeLabels[document.type] || document.type} ·{' '}
                            {(document.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                      <a
                        href={`${API_URL}/applications/${application.id}/documents/${document.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-forest-900/15 px-3 py-1.5 text-xs font-semibold text-forest-700 transition hover:bg-forest-50"
                      >
                        <Download className="h-3.5 w-3.5" /> Abrir
                      </a>
                    </div>
                  ))}
                </PaginatedList>
              ) : (
                <p className="text-sm text-ink/45">El cliente no adjuntó documentos.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {isAdmin && canDecide && (
            <Card>
              <CardHeader title="Decisión" description="La aprobación final es del administrador." />
              <CardContent className="space-y-3">
                <div className="rounded-2xl bg-forest-50 p-4 text-sm text-forest-900">
                  <ShieldCheck className="mb-1 h-4 w-4" />
                  Revisá la capacidad de pago, los documentos y las referencias antes de aprobar.
                </div>
                <Button className="w-full" onClick={openApprove}>
                  <CheckCircle2 className="h-4 w-4" /> Aprobar solicitud
                </Button>
                <Button variant="danger" className="w-full" onClick={openReject}>
                  <XCircle className="h-4 w-4" /> Rechazar solicitud
                </Button>
              </CardContent>
            </Card>
          )}

          {!isAdmin && canDecide && (
            <Card>
              <CardHeader title="Revisión" />
              <CardContent className="space-y-3 text-sm text-ink/60">
                <div className="rounded-2xl bg-forest-50 p-4 text-forest-900">
                  <ShieldCheck className="mb-1 h-4 w-4" />
                  Podés dejar observaciones para el administrador. La aprobación final la realiza
                  el administrador.
                </div>
                <Button variant="outline" className="w-full" onClick={() => openReview('UNDER_REVIEW')}>
                  Agregar observación
                </Button>
              </CardContent>
            </Card>
          )}

          {loan && (
            <Card>
              <CardHeader title="Préstamo generado" />
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-ink/45">Monto aprobado</span>
                  <span className="font-semibold text-forest-950">{formatCurrency(loan.principal)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-ink/45">Saldo</span>
                  <span className="font-semibold text-forest-950">{formatCurrency(loan.balance)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-ink/45">Interés total</span>
                  <span className="font-semibold text-forest-950">{loan.annualRate}%</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-ink/45">Estado</span>
                  <StatusBadge status={loan.status} />
                </div>
                <Link to={`/admin/prestamos/${loan.id}`} className="mt-2 block">
                  <Button variant="outline" className="w-full">
                    Gestionar préstamo <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader title="Cobrador asignado" />
            <CardContent>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-forest-50 text-forest-700">
                  <UserRound className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-forest-950">
                    {client?.profile?.assignedCollector?.name || loan?.assignedCollector?.name || 'Por asignar'}
                  </p>
                  <p className="text-xs text-ink/45">Seguimiento de ruta</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title={reviewStatus === 'INFO_REQUESTED' ? 'Solicitar información' : 'Marcar en revisión'}
        description="El cliente recibirá una notificación en su portal."
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => reviewMutation.mutate()} loading={reviewMutation.isPending}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="review-status">Estado</Label>
            <Select
              id="review-status"
              value={reviewStatus}
              onChange={(event) => setReviewStatus(event.target.value)}
            >
              <option value="UNDER_REVIEW">En revisión</option>
              <option value="INFO_REQUESTED">Información solicitada</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="review-notes">Nota para el cliente / equipo</Label>
            <Textarea
              id="review-notes"
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              placeholder="Ej. Necesitamos una imagen más legible de tu cédula."
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Aprobar solicitud"
        description="Se creará el préstamo y su plan de pagos."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setApproveOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => approveMutation.mutate()}
              loading={approveMutation.isPending}
              disabled={!approveForm.firstDueDate || !settingsQuery.data || (Boolean(application.renewalOfLoanId) && (!sourceLoan || historyQuery.isError || approveForm.approvedAmount <= (sourceLoan.balance || 0)))}
            >
              Aprobar y crear préstamo
            </Button>
          </>
        }
      >
        {application.renewalOfLoanId && sourceLoan && <RenewalSummary amount={approveForm.approvedAmount} balance={sourceLoan.balance || 0} rate={approveForm.annualRate} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="approvedAmount">Monto aprobado (₡)</Label>
            <Select
              id="approvedAmount"
              value={approveForm.approvedAmount}
              onChange={(event) =>
                setApproveForm((current) => ({
                  ...current,
                  approvedAmount: Number(event.target.value),
                }))
              }
            >
              {loanAmounts.filter((value) => value <= application.amountRequested).map((value) => (
                <option key={value} value={value}>
                  {formatCurrency(value)}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-ink/40">
              Montos habilitados actualmente, hasta el monto solicitado.
            </p>
          </div>
          <div>
            <Label htmlFor="annualRate">Interés total (%)</Label>
            <Input
              id="annualRate"
              type="number"
              min={0}
              step={0.5}
              value={approveForm.annualRate}
              onChange={(event) =>
                setApproveForm((current) => ({ ...current, annualRate: Number(event.target.value) }))
              }
            />
          </div>
          <div>
            <Label htmlFor="approvedTerm">Plazo</Label>
            <Select
              id="approvedTerm"
              value={approveForm.termWeeks}
              onChange={(event) =>
                setApproveForm((current) => ({
                  ...current,
                  termWeeks: Number(event.target.value),
                }))
              }
            >
              {termsForFrequency(approveForm.paymentFrequency, settingsQuery.data).map((value) => (
                <option key={value} value={value}>
                  {formatTermForFrequency(value, approveForm.paymentFrequency)}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[11px] text-ink/40">
              {formatInstallments(
                installmentsForTermWeeks(approveForm.termWeeks, approveForm.paymentFrequency),
                approveForm.paymentFrequency,
              )}
            </p>
          </div>
          <div>
            <Label htmlFor="approvedFrequency">Frecuencia</Label>
            <Select
              id="approvedFrequency"
              value={approveForm.paymentFrequency}
              onChange={(event) => {
                const frequency = event.target.value
                const firstDueDays =
                  frequency === 'WEEKLY' ? 7 : frequency === 'BIWEEKLY' ? 14 : 30
                setApproveForm((current) => ({
                  ...current,
                  paymentFrequency: frequency,
                  termWeeks: adjustTermForFrequency(current.termWeeks, frequency, settingsQuery.data),
                  firstDueDate: isoDate(addDays(new Date(), firstDueDays)),
                }))
              }}
            >
              <option value="WEEKLY">Semanal</option>
              <option value="BIWEEKLY" disabled={termsForFrequency('BIWEEKLY', settingsQuery.data).length === 0}>Quincenal</option>
              <option value="MONTHLY" disabled={termsForFrequency('MONTHLY', settingsQuery.data).length === 0}>Mensual</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="firstDueDate">Primer vencimiento</Label>
            <Input
              id="firstDueDate"
              type="date"
              value={approveForm.firstDueDate}
              onChange={(event) =>
                setApproveForm((current) => ({ ...current, firstDueDate: event.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="assignedCollector">Cobrador asignado</Label>
            <Select
              id="assignedCollector"
              value={approveForm.assignedCollectorId}
              onChange={(event) =>
                setApproveForm((current) => ({
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
          <div className="rounded-2xl bg-forest-50 p-4 text-sm text-forest-900 sm:col-span-2">
            <p className="font-semibold">Vista previa de la cuota</p>
            <p className="mt-1 text-xs leading-relaxed text-forest-700">
              La cuota se calcula al confirmar, según el monto, el interés total, el plazo y la frecuencia.
              Podés revisarla en el detalle del préstamo.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Rechazar solicitud"
        description="El cliente recibirá el motivo en su portal."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => rejectMutation.mutate()}
              loading={rejectMutation.isPending}
              disabled={rejectReason.trim().length < 5}
            >
              Rechazar solicitud
            </Button>
          </>
        }
      >
        <div>
          <Label htmlFor="reject-reason">Motivo del rechazo</Label>
          <Textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Explicá de forma clara y respetuosa el motivo."
          />
        </div>
      </Modal>
    </div>
  )
}
