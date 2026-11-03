import { useState } from 'react'
import { PaginatedList } from '@/components/ui/Pagination'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Circle,
  Download,
  FileText,
  Paperclip,
  Send,
  ShieldCheck,
  Upload,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { API_URL, api, apiErrorMessage } from '@/lib/api'
import {
  documentTypeLabels,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatInstallmentCount,
  formatInstallments,
  frequencyLabels,
} from '@/lib/format'
import { formatTermForFrequency } from '@/lib/loan-options'
import type { Application, Loan, Settings } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingBlock } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { RenewalSummary } from '@/components/RenewalSummary'

const progressSteps = [
  { key: 'CREATED', label: 'Solicitud creada' },
  { key: 'SUBMITTED', label: 'Enviada a revisión' },
  { key: 'UNDER_REVIEW', label: 'En revisión' },
  { key: 'DECISION', label: 'Decisión' },
  { key: 'DISBURSED', label: 'Desembolso' },
  { key: 'PAYMENTS', label: 'Plan de pagos' },
]

export function ClientApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const applicationQuery = useQuery<Application>({
    queryKey: ['my-application', id],
    queryFn: async () => (await api.get(`/applications/me/${id}`)).data,
    enabled: Boolean(id),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['my-application', id] })
    queryClient.invalidateQueries({ queryKey: ['my-applications'] })
  }
  const sourceId = applicationQuery.data?.renewalOfLoanId
  const sourceQuery = useQuery<Loan>({ queryKey: ['my-loan', sourceId], queryFn: async () => (await api.get(`/loans/me/${sourceId}`)).data, enabled: Boolean(sourceId) })
  const settingsQuery = useQuery<Settings>({ queryKey: ['public-settings'], queryFn: async () => (await api.get('/public/settings')).data, enabled: Boolean(sourceId) })

  const submitMutation = useMutation({
    mutationFn: async () => (await api.post(`/applications/${id}/submit`)).data,
    onSuccess: () => {
      invalidate()
      toast.success('Solicitud enviada. Ya está en manos del equipo.')
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error('Seleccioná un archivo.')
      const data = new FormData()
      data.append('file', uploadFile)
      if (uploadFile.size > 5 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(uploadFile.type)) throw new Error('La cédula debe ser PDF, JPG o PNG y pesar hasta 5 MB.')
      data.append('type', 'ID_CARD')
      return (await api.post(`/applications/${id}/documents`, data)).data
    },
    onSuccess: () => {
      setUploadFile(null)
      invalidate()
      toast.success('Documento adjuntado.')
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  if (applicationQuery.isLoading) return <LoadingBlock label="Cargando tu solicitud…" />
  if (applicationQuery.isError || !applicationQuery.data) {
    return (
      <EmptyState
        title="No encontramos esa solicitud"
        description="Puede que el enlace ya no esté disponible."
        action={
          <Link to="/app/solicitudes">
            <Button>Volver a mis solicitudes</Button>
          </Link>
        }
      />
    )
  }

  const application = applicationQuery.data
  const isEditable = ['DRAFT', 'SUBMITTED', 'INFO_REQUESTED'].includes(application.status)
  const isDraft = application.status === 'DRAFT'
  const loan = application.loan

  const completed = new Set<string>(['CREATED'])
  if (application.submittedAt) {
    completed.add('SUBMITTED')
  }
  if (['UNDER_REVIEW', 'INFO_REQUESTED', 'RECOMMENDED', 'APPROVED', 'REJECTED'].includes(application.status)) {
    completed.add('UNDER_REVIEW')
  }
  if (['APPROVED', 'REJECTED'].includes(application.status)) {
    completed.add('DECISION')
  }
  if (loan?.disbursedAt) {
    completed.add('DISBURSED')
    completed.add('PAYMENTS')
  }

  const statusMessage = {
    DRAFT: {
      title: 'Tu solicitud está en borrador',
      text: 'Adjuntá tu cédula de identidad y enviá esta solicitud. No necesitás crear otra ni adjuntar otros documentos.',
      tone: 'bg-forest-50 text-forest-800',
    },
    SUBMITTED: {
      title: 'Solicitud recibida',
      text: 'Ya recibimos tu solicitud. El equipo la revisará y te avisará si necesita información adicional.',
      tone: 'bg-sky-50 text-sky-800',
    },
    UNDER_REVIEW: {
      title: 'Estamos revisando tu caso',
      text: 'El equipo está evaluando tu información. Si necesitamos algo más, te lo pediremos por aquí.',
      tone: 'bg-amber-50 text-amber-900',
    },
    INFO_REQUESTED: {
      title: 'Necesitamos información adicional',
      text: application.reviewNotes || 'Revisá las notas del equipo y adjuntá la información solicitada.',
      tone: 'bg-violet-50 text-violet-800',
    },
    APPROVED: {
      title: '¡Tu solicitud fue aprobada!',
      text: 'La aprobación está lista. Cuando se coordine el desembolso, vas a ver tu plan de pagos en el portal.',
      tone: 'bg-emerald-50 text-emerald-800',
    },
    REJECTED: {
      title: 'Tu solicitud no fue aprobada',
      text: application.rejectionReason || 'Podés comunicarte con el equipo para conocer más detalles.',
      tone: 'bg-red-50 text-red-800',
    },
  }[application.status]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/app/solicitudes"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700 hover:text-forest-900"
        >
          <ArrowLeft className="h-4 w-4" /> Mis solicitudes
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
              {formatTermForFrequency(application.termWeeks, application.paymentFrequency)} ·{' '}
              {formatInstallments(application.termInstallments, application.paymentFrequency)} ·
              Creada el{' '}
              {formatDate(application.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isDraft && (
              <Button disabled={!application.documents?.some((document) => document.type === 'ID_CARD')} onClick={() => submitMutation.mutate()} loading={submitMutation.isPending}>
                <Send className="h-4 w-4" /> Enviar solicitud
              </Button>
            )}
            {loan && (
              <Link to={`/app/prestamos/${loan.id}`}>
                <Button variant="outline">
                  <Wallet className="h-4 w-4" /> Ver préstamo
                </Button>
              </Link>
            )}
          </div>
        </div>

        {statusMessage && (
          <div className={`mt-5 rounded-2xl p-4 text-sm leading-relaxed ${statusMessage.tone}`}>
            <p className="font-semibold">{statusMessage.title}</p>
            <p className="mt-1 opacity-80">{statusMessage.text}</p>
          </div>
        )}
      </div>

      {sourceId && (loan?.disbursedAt || sourceQuery.data) && <RenewalSummary amount={loan?.principal || application.amountRequested} balance={loan?.disbursedAt ? loan.renewalPayoff || 0 : sourceQuery.data?.balance || 0} rate={loan?.annualRate ?? application.annualRate ?? settingsQuery.data?.annualRate ?? 5} estimated={!loan?.disbursedAt} />}
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Seguimiento" description="El avance de tu solicitud." />
            <CardContent>
              <div className="space-y-0">
                {progressSteps.map((step, index) => {
                  const done = completed.has(step.key)
                  const current =
                    (step.key === 'UNDER_REVIEW' &&
                      ['UNDER_REVIEW', 'INFO_REQUESTED', 'RECOMMENDED'].includes(application.status)) ||
                    (step.key === 'DECISION' && application.status === 'APPROVED')
                  return (
                    <div key={step.key} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={`grid h-8 w-8 place-items-center rounded-full ${
                            done
                              ? 'bg-forest-900 text-cream'
                              : current
                                ? 'bg-gold text-forest-950'
                                : 'bg-forest-50 text-forest-400'
                          }`}
                        >
                          {done ? <Check className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}
                        </span>
                        {index < progressSteps.length - 1 && (
                          <span className={`h-8 w-px ${done ? 'bg-forest-300' : 'bg-forest-100'}`} />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className={`text-sm font-semibold ${done || current ? 'text-forest-950' : 'text-ink/45'}`}>
                          {step.label}
                        </p>
                        {step.key === 'CREATED' && (
                          <p className="mt-0.5 text-xs text-ink/40">{formatDateTime(application.createdAt)}</p>
                        )}
                        {step.key === 'SUBMITTED' && application.submittedAt && (
                          <p className="mt-0.5 text-xs text-ink/40">{formatDateTime(application.submittedAt)}</p>
                        )}
                        {step.key === 'DECISION' && application.decisionAt && (
                          <p className="mt-0.5 text-xs text-ink/40">{formatDateTime(application.decisionAt)}</p>
                        )}
                        {step.key === 'DISBURSED' && loan?.disbursedAt && (
                          <p className="mt-0.5 text-xs text-ink/40">{formatDateTime(loan.disbursedAt)}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Documentos"
              description="Archivos que compartiste con el equipo."
              action={
                <span className="rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-700">
                  {application.documents?.length || 0}
                </span>
              }
            />
            <CardContent className="space-y-4">
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
                <p className="text-sm text-ink/45">Todavía no adjuntaste documentos.</p>
              )}

              {isEditable && (
                <div className="rounded-2xl bg-forest-50 p-4">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-forest-700" />
                    <p className="text-sm font-semibold text-forest-900">Adjuntar cédula de identidad</p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-forest-900/20 bg-white px-3 py-2 text-sm text-ink/50 transition hover:border-forest-400">
                      <Upload className="h-4 w-4 text-forest-600" />
                      <span className="min-w-0 break-all">{uploadFile?.name || 'Seleccionar archivo'}</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                      />
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!uploadFile}
                      loading={uploadMutation.isPending}
                      onClick={() => uploadMutation.mutate()}
                    >
                      Subir
                    </Button>
                  </div>
                  <p className="mt-2 text-[11px] text-ink/40">Solo cédula de identidad · PDF, JPG o PNG · máximo 5 MB. Obligatoria para enviar la solicitud.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Detalle de la solicitud" />
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-ink/45">Monto solicitado</span>
                <span className="font-semibold text-forest-950">{formatCurrency(application.amountRequested)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-ink/45">Plazo</span>
                <span className="font-semibold text-forest-950">
                  {formatTermForFrequency(application.termWeeks, application.paymentFrequency)} ·{' '}
                  {formatInstallmentCount(application.termInstallments)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-ink/45">Frecuencia</span>
                <span className="font-semibold text-forest-950">
                  {frequencyLabels[application.paymentFrequency]}
                </span>
              </div>
              {application.approvedAmount && (
                <div className="flex justify-between gap-4 border-t border-forest-900/10 pt-3">
                  <span className="text-ink/45">Monto aprobado</span>
                  <span className="font-semibold text-emerald-700">{formatCurrency(application.approvedAmount)}</span>
                </div>
              )}
              {application.annualRate !== null && application.annualRate !== undefined && (
                <div className="flex justify-between gap-4">
                  <span className="text-ink/45">Interés total</span>
                  <span className="font-semibold text-forest-950">{application.annualRate}%</span>
                </div>
              )}
              {application.purpose && (
                <div className="border-t border-forest-900/10 pt-3">
                  <p className="text-ink/45">Propósito</p>
                  <p className="mt-1 leading-relaxed text-ink/70">{application.purpose}</p>
                </div>
              )}
              {application.reviewNotes && (
                <div className="rounded-2xl bg-forest-50 p-3 text-xs leading-relaxed text-forest-800">
                  <p className="font-semibold">Nota del equipo</p>
                  <p className="mt-1">{application.reviewNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {loan && (
            <Card>
              <CardHeader title="Tu préstamo" description="Resumen del crédito aprobado." />
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-ink/45">Monto</span>
                  <span className="font-semibold text-forest-950">{formatCurrency(loan.principal)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-ink/45">Saldo</span>
                  <span className="font-semibold text-forest-950">{formatCurrency(loan.balance)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-ink/45">Próximo pago</span>
                  <span className="font-semibold text-forest-950">{formatDate(loan.nextDueDate)}</span>
                </div>
                <Link to={`/app/prestamos/${loan.id}`} className="mt-2 block">
                  <Button variant="outline" className="w-full">
                    Ver plan de pagos <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <div className="rounded-3xl bg-forest-950 p-5 text-cream">
            <CalendarDays className="h-6 w-6 text-gold" />
            <p className="mt-3 font-display text-xl font-semibold">¿Necesitás ayuda?</p>
            <p className="mt-1 text-sm leading-relaxed text-cream/60">
              Escribinos a info@jycprestamos.cr o llamanos al 8515-7835. Podemos revisar tu caso
              juntos.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-cream/45">
              <ShieldCheck className="h-4 w-4 text-gold" /> Tus datos se tratan con confidencialidad.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
