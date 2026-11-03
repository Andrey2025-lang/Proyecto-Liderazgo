import { useEffect, useRef, useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck2,
  FileText,
  IdCard,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  documentTypeLabels,
  formatCurrency,
  formatInstallmentCount,
  formatInstallments,
  frequencyLabels,
} from '@/lib/format'
import {
  INCOME_RANGES,
  LOAN_AMOUNTS,
  LOAN_PURPOSES,
  adjustTermForFrequency,
  installmentsForTermWeeks,
  formatTermForFrequency,
  availableTerms,
  termsForFrequency,
} from '@/lib/loan-options'
import type { Application, Loan, Settings, SimulateResult } from '@/lib/types'
import { RenewalSummary } from '@/components/RenewalSummary'
import { CommunityField } from '@/components/ui/CommunityField'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Progress } from '@/components/ui/Progress'
import { LoadingBlock } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/StatusBadge'

const schema = z.object({
  name: z.string().min(3, 'Ingresá tu nombre completo.'),
  phone: z.string().min(8, 'Ingresá un teléfono de contacto.'),
  cedula: z
    .string()
    .regex(/^\d-\d{4}-\d{4}$/, 'Usá el formato 1-2345-6789.'),
  community: z.string().trim().min(1, 'Escribí o elegí tu zona.').max(120).refine((value) => value !== 'Otra zona', 'Especificá el nombre de la zona.'),
  occupation: z.string().trim().min(1, 'Escribí tu ocupación.').max(120),
  monthlyIncome: z.number().min(0, 'El ingreso no puede ser negativo.'),
  amountRequested: z.number().positive(),
  termWeeks: z.number().int().positive(),
  paymentFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY'], {
    message: 'Elegí una frecuencia de pago.',
  }),
  purpose: z.string().min(1, 'Elegí el destino del préstamo.'),
  acceptPrivacy: z.boolean().refine((value) => value, {
    message: 'Debés aceptar la política de privacidad.',
  }),
  acceptEquifax: z.boolean().refine((value) => value, {
    message: 'Debés autorizar la consulta de referencias.',
  }),
})

type FormValues = z.infer<typeof schema>

const documentTypes = ['ID_CARD']
const activeStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'RECOMMENDED']

const steps = [
  { title: 'Tus datos', description: 'Contacto, zona y ocupación', icon: UserRound },
  { title: 'Tu préstamo', description: 'Monto, plazo y destino', icon: Wallet },
  { title: 'Documentos y permisos', description: 'Adjuntá archivos y confirmá', icon: FileCheck2 },
]

function closestIncome(value?: number | null) {
  if (!value) return INCOME_RANGES[1].value
  return INCOME_RANGES.reduce((closest, range) =>
    Math.abs(range.value - value) < Math.abs(closest.value - value) ? range : closest,
  ).value
}

export function NewApplicationPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const renewalOfLoanId = params.get('renovar') || undefined
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const createdDraft = useRef<string | null>(null)

  const settingsQuery = useQuery<Settings>({
    queryKey: ['public-settings'],
    queryFn: async () => (await api.get('/public/settings')).data,
  })
  const activeApplicationsQuery = useQuery<Application[]>({
    queryKey: ['my-applications'],
    queryFn: async () => (await api.get('/applications/me')).data,
  })
  const activeApplication = activeApplicationsQuery.data?.find((item) =>
    activeStatuses.includes(item.status),
  )
  const loansQuery = useQuery<Loan[]>({ queryKey: ['my-loans'], queryFn: async () => (await api.get('/loans/me')).data })
  const pendingLoan = loansQuery.data?.find((loan) => loan.status === 'PENDING_DISBURSEMENT')
  const activeLoans = loansQuery.data?.filter((loan) => ['ACTIVE', 'DEFAULTED'].includes(loan.status)) || []
  const sourceLoan = loansQuery.data?.find((loan) => loan.id === renewalOfLoanId)
  const loanAmounts = settingsQuery.data?.loanAmounts || [...LOAN_AMOUNTS]
  const allTerms = availableTerms(settingsQuery.data)

  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(
      schema
        .extend({
          amountRequested: z.number().refine((value) => loanAmounts.includes(value), 'Elegí un monto disponible.'),
        })
        .superRefine((value, ctx) => {
          if (!allTerms.includes(value.termWeeks)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['termWeeks'], message: 'Elegí un plazo disponible.' })
          } else if (!termsForFrequency(value.paymentFrequency, settingsQuery.data).includes(value.termWeeks)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['termWeeks'], message: 'El plazo no coincide con la frecuencia de pago.' })
          }
        }),
    ),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      cedula: user?.profile?.cedula || '',
      community: user?.profile?.community || '',
      occupation: user?.profile?.occupation || '',
      monthlyIncome: closestIncome(user?.profile?.monthlyIncome),
      amountRequested: 50000,
      termWeeks: 8,
      paymentFrequency: 'WEEKLY',
      purpose: '',
      acceptPrivacy: false,
      acceptEquifax: false,
    },
  })

  const values = watch()
  useEffect(() => {
    const settings = settingsQuery.data
    if (!settings) return
    if (!settings.loanAmounts.includes(values.amountRequested)) setValue('amountRequested', settings.loanAmounts[0])
    if (values.termWeeks < settings.minTerm || values.termWeeks > settings.maxTerm) setValue('termWeeks', settings.maxTerm)
  }, [settingsQuery.data, values.amountRequested, values.termWeeks, setValue])
  useEffect(() => {
    const compatible = termsForFrequency(values.paymentFrequency, settingsQuery.data)
    if (compatible.length && !compatible.includes(values.termWeeks)) {
      setValue('termWeeks', adjustTermForFrequency(values.termWeeks, values.paymentFrequency, settingsQuery.data), { shouldValidate: true })
    }
  }, [settingsQuery.data, values.paymentFrequency, values.termWeeks, setValue])
  const frequencyTerms = termsForFrequency(values.paymentFrequency, settingsQuery.data)
  const installments = installmentsForTermWeeks(values.termWeeks, values.paymentFrequency)
  const simulation = useQuery<SimulateResult>({
    queryKey: [
      'application-simulate',
      values.amountRequested,
      values.termWeeks,
      values.paymentFrequency,
      installments,
      settingsQuery.data?.annualRate,
    ],
    queryFn: async () =>
      (
        await api.post('/public/simulate', {
          amount: values.amountRequested,
          termWeeks: values.termWeeks,
          termInstallments: installments,
          paymentFrequency: values.paymentFrequency,
        })
      ).data,
    enabled: Boolean(settingsQuery.data && loanAmounts.includes(values.amountRequested) && frequencyTerms.includes(values.termWeeks)),
  })

  const mutation = useMutation({
    mutationFn: async ({ form, submit }: { form: FormValues; submit: boolean }) => {
      if (submit && !files.ID_CARD) throw new Error('Adjuntá tu cédula de identidad antes de enviar la solicitud.')
      if (renewalOfLoanId && (!sourceLoan || form.amountRequested <= (sourceLoan.balance || 0))) throw new Error('El monto debe superar el saldo anterior y el préstamo debe estar disponible.')
      const { data: application } = await api.post<Application>('/applications', {
        name: form.name,
        phone: form.phone,
        cedula: form.cedula,
        address: `${form.community}, Guanacaste`,
        community: form.community,
        occupation: form.occupation,
        monthlyIncome: form.monthlyIncome,
        amountRequested: form.amountRequested,
        termWeeks: form.termWeeks,
        termInstallments: installmentsForTermWeeks(form.termWeeks, form.paymentFrequency),
        paymentFrequency: form.paymentFrequency,
        purpose: form.purpose,
        renewalOfLoanId,
        acceptPrivacy: form.acceptPrivacy,
        acceptEquifax: form.acceptEquifax,
        saveAsDraft: true,
      })
      createdDraft.current = application.id

      for (const [type, file] of Object.entries(files)) {
        if (!file) continue
        const data = new FormData()
        data.append('file', file)
        data.append('type', type)
        await api.post(`/applications/${application.id}/documents`, data)
      }

      if (submit) {
        await api.post(`/applications/${application.id}/submit`)
      }
      return application
    },
    onSuccess: (application, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-applications'] })
      queryClient.invalidateQueries({ queryKey: ['client-me'] })
      toast.success(
        variables.submit
          ? 'Solicitud enviada. Te avisaremos cuando esté en revisión.'
          : 'Borrador guardado. Podés continuar después.',
      )
      navigate(`/app/solicitudes/${application.id}`)
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error))
      if (createdDraft.current) {
        queryClient.invalidateQueries({ queryKey: ['my-applications'] })
        navigate(`/app/solicitudes/${createdDraft.current}`)
        toast.info('Tu borrador se conservó. Podés completar la cédula y enviarlo desde aquí.')
      }
    },
  })

  const stepFields: Record<number, (keyof FormValues)[]> = {
    0: ['name', 'phone', 'cedula', 'community', 'occupation', 'monthlyIncome'],
    1: ['amountRequested', 'termWeeks', 'paymentFrequency', 'purpose'],
    2: ['acceptPrivacy', 'acceptEquifax'],
  }

  const next = async () => {
    const valid = await trigger(stepFields[step])
    if (valid) setStep((value) => Math.min(value + 1, steps.length - 1))
  }

  const onInvalid = (formErrors: FieldErrors<FormValues>) => {
    const firstStep = steps.findIndex((_, index) =>
      stepFields[index].some((field) => Boolean(formErrors[field])),
    )
    if (firstStep >= 0) setStep(firstStep)
    toast.error('Revisá los campos marcados antes de continuar.')
  }

  const submitApplication = handleSubmit(
    (form) => mutation.mutate({ form, submit: true }),
    onInvalid,
  )

  const saveDraft = handleSubmit(
    (form) => mutation.mutate({ form, submit: false }),
    onInvalid,
  )

  if (activeApplicationsQuery.isLoading || settingsQuery.isLoading || loansQuery.isLoading) {
    return <LoadingBlock label="Revisando tus solicitudes…" />
  }

  if (activeApplicationsQuery.isError || loansQuery.isError || settingsQuery.isError) {
    return <EmptyState title="No pudimos verificar tus solicitudes" description="Recargá la página antes de continuar. Necesitamos comprobar si ya tenés una solicitud o un préstamo activo." />
  }

  if (activeApplication) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-4xl border border-forest-900/10 bg-white p-7 text-center shadow-card sm:p-10">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-forest-50 text-forest-700">
            <FileText className="h-7 w-7" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold text-forest-950">
            Ya tenés una solicitud en proceso
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink/55">
            Para evitar duplicados, primero terminá o revisá la solicitud que ya está activa. Si
            necesitás corregir algo, podés adjuntar documentos o comunicarte con el equipo.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <StatusBadge status={activeApplication.status} />
            <span className="text-sm font-semibold text-forest-950">
              {formatCurrency(activeApplication.amountRequested)}
            </span>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to={`/app/solicitudes/${activeApplication.id}`}>
              <Button>
                Ver mi solicitud <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/app">
              <Button variant="outline">Volver al inicio</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (pendingLoan || (activeLoans.length > 0 && !activeLoans.some((loan) => loan.id === renewalOfLoanId))) {
    return <Card><CardHeader title={pendingLoan ? 'Tu préstamo está pendiente de desembolso' : 'Ya tenés un préstamo activo'} /><CardContent className="space-y-4">
      <p className="text-sm text-ink/65">{pendingLoan ? 'Primero debe completarse el desembolso del préstamo aprobado.' : 'No podés solicitar otro préstamo independiente. Podés solicitar una renovación para cancelar el saldo anterior y recibir la diferencia, sujeta a aprobación.'}</p>
      {pendingLoan ? <Link className="block" to={`/app/prestamos/${pendingLoan.id}`}><Button>Ver préstamo aprobado</Button></Link> : activeLoans.map((loan) => <Link className="block" key={loan.id} to={`/app/solicitudes/nueva?renovar=${loan.id}`}><Button>Renovar préstamo de {formatCurrency(loan.principal)}</Button></Link>)}
    </CardContent></Card>
  }

  return (
    <div className="mx-auto max-w-5xl">
      {settingsQuery.isError && <p role="alert" className="mb-4 text-red-700">No se pudieron cargar las condiciones. Recargá antes de solicitar.</p>}
      {renewalOfLoanId && sourceLoan && <RenewalSummary amount={values.amountRequested} balance={sourceLoan.balance || 0} rate={settingsQuery.data?.annualRate ?? 5} />}
      {renewalOfLoanId && !sourceLoan && <p role="alert" className="mb-4 text-red-700">No se encontró el préstamo que querés renovar.</p>}
      <div className="mb-6">
        <Link
          to="/app"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700 hover:text-forest-900"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Link>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-forest-950 sm:text-4xl">
          {renewalOfLoanId ? 'Solicitar renovación' : 'Nueva solicitud'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/55">
          Completá tres pasos y elegí las condiciones disponibles. Podés guardar un borrador y continuar después.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-forest-900/10 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between text-xs font-semibold text-ink/45">
              <span>
                Paso {step + 1} de {steps.length}
              </span>
              <span>{Math.round(((step + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="mt-3">
              <Progress value={step + 1} max={steps.length} />
            </div>
            <div className="mt-5 space-y-1">
              {steps.map((item, index) => {
                const active = index === step
                const complete = index < step
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => {
                      if (index <= step) setStep(index)
                    }}
                    className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                      active ? 'bg-forest-50' : complete ? 'hover:bg-forest-50/60' : ''
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        complete
                          ? 'bg-forest-900 text-cream'
                          : active
                            ? 'bg-gold text-forest-950'
                            : 'bg-forest-50 text-forest-600'
                      }`}
                    >
                      {complete ? <Check className="h-4 w-4" /> : <item.icon className="h-4 w-4" />}
                    </span>
                    <span>
                      <span
                        className={`block text-sm font-semibold ${active ? 'text-forest-950' : 'text-ink/65'}`}
                      >
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink/40">{item.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="mt-5 rounded-2xl bg-forest-50 p-3 text-xs leading-relaxed text-forest-800">
              <ShieldCheck className="mb-1 h-4 w-4" />
              Tus datos se usan únicamente para evaluar esta solicitud. No compartas información
              sensible que no sea necesaria.
            </div>
          </div>
        </aside>

        <form className="space-y-5">
          <Card>
            <CardHeader title={steps[step].title} description={steps[step].description} />
            <CardContent className="space-y-5">
              {step === 0 && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="name">Nombre completo *</Label>
                      <Input
                        id="name"
                        placeholder="Ana Mora"
                        autoComplete="name"
                        error={errors.name?.message}
                        {...register('name')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Teléfono *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        placeholder="8888-8888"
                        autoComplete="tel"
                        error={errors.phone?.message}
                        {...register('phone')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cedula">Cédula *</Label>
                      <Input
                        id="cedula"
                        placeholder="1-2345-6789"
                        inputMode="numeric"
                        error={errors.cedula?.message}
                        {...register('cedula')}
                      />
                    </div>
                    <Controller name="community" control={control} render={({ field }) => <CommunityField value={field.value} onChange={field.onChange} error={errors.community?.message} required />} />
                    <div>
                      <Label htmlFor="occupation">Ocupación *</Label>
                      <Input
                        id="occupation"
                        maxLength={120}
                        placeholder="Ej.: Técnico en refrigeración"
                        error={errors.occupation?.message}
                        {...register('occupation')}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="monthlyIncome">Ingreso mensual aproximado *</Label>
                      <Select
                        id="monthlyIncome"
                        error={errors.monthlyIncome?.message}
                        {...register('monthlyIncome', { valueAsNumber: true })}
                      >
                        {INCOME_RANGES.map((range) => (
                          <option key={range.value} value={range.value}>
                            {range.label}
                          </option>
                        ))}
                      </Select>
                      <p className="mt-1 text-[11px] text-ink/40">
                        Elegí un rango. No necesitás escribir el monto exacto.
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-forest-50 p-4 text-xs leading-relaxed text-forest-800">
                    <Sparkles className="mb-1 h-4 w-4" />
                    Usá los selectores para completar el formulario más rápido. Tu nombre y cédula
                    ya vienen de tu cuenta, pero podés corregirlos si hace falta.
                  </div>
                  <p className="text-xs text-ink/40">Los campos con * son obligatorios.</p>
                </>
              )}

              {step === 1 && (
                <>
                  <div>
                    <Label>Monto solicitado *</Label>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      {loanAmounts.map((value) => {
                        const selected = values.amountRequested === value
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setValue('amountRequested', value, { shouldValidate: true })}
                            aria-pressed={selected}
                            aria-label={`Seleccionar ${formatCurrency(value)}`}
                            className={`rounded-2xl border px-3 py-4 text-left transition ${
                              selected
                                ? 'border-forest-900 bg-forest-900 text-cream shadow-sm'
                                : 'border-forest-900/15 bg-white text-forest-900 hover:border-forest-600 hover:bg-forest-50'
                            }`}
                          >
                            <span className="block font-display text-xl font-semibold">
                              {formatCurrency(value)}
                            </span>
                            <span
                              className={`mt-0.5 block text-[11px] ${selected ? 'text-cream/60' : 'text-ink/40'}`}
                            >
                              Monto disponible
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    {errors.amountRequested && (
                      <p className="mt-1 text-xs font-medium text-red-600">
                        {errors.amountRequested.message}
                      </p>
                    )}
                    <input type="hidden" {...register('amountRequested', { valueAsNumber: true })} />
                    <p className="mt-2 text-[11px] text-ink/40">
                      Estos son los montos habilitados actualmente por administración.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="termWeeks">Plazo *</Label>
                      <Select
                        id="termWeeks"
                        error={errors.termWeeks?.message}
                        disabled={frequencyTerms.length === 0}
                        {...register('termWeeks', { valueAsNumber: true })}
                      >
                        {frequencyTerms.length === 0 ? (
                          <option value="">Sin plazos disponibles para esta frecuencia</option>
                        ) : (
                          frequencyTerms.map((value) => (
                            <option key={value} value={value}>
                              {formatTermForFrequency(value, values.paymentFrequency)}
                            </option>
                          ))
                        )}
                      </Select>
                      <p className="mt-1 text-[11px] text-ink/40">
                        {formatInstallments(installments, values.paymentFrequency)}
                        {values.paymentFrequency === 'MONTHLY' && ' · cada mes'}
                        {values.paymentFrequency === 'BIWEEKLY' && ' · cada quincena'}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="paymentFrequency">Frecuencia de pago *</Label>
                      <Select
                        id="paymentFrequency"
                        error={errors.paymentFrequency?.message}
                        {...register('paymentFrequency')}
                      >
                        <option value="WEEKLY">Semanal</option>
                        <option value="BIWEEKLY" disabled={termsForFrequency('BIWEEKLY', settingsQuery.data).length === 0}>Quincenal</option>
                        <option value="MONTHLY" disabled={termsForFrequency('MONTHLY', settingsQuery.data).length === 0}>Mensual</option>
                      </Select>
                      <p className="mt-1 text-[11px] text-ink/40">
                        Los plazos se ajustan a la frecuencia: mensual usa meses completos.
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="purpose">¿Para qué necesitás el préstamo? *</Label>
                      <Select id="purpose" error={errors.purpose?.message} {...register('purpose')}>
                        <option value="">Seleccioná el destino</option>
                        {LOAN_PURPOSES.map((purpose) => (
                          <option key={purpose} value={purpose}>
                            {purpose}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-forest-950 p-5 text-cream">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cream/45">
                          Cuota estimada
                        </p>
                        <p className="mt-1 font-display text-3xl font-semibold">
                          {simulation.isFetching ? '…' : simulation.isSuccess ? formatCurrency(simulation.data.installment) : '—'}
                        </p>
                      </div>
                      <span className="rounded-full bg-cream/10 px-3 py-1 text-xs text-cream/65">
                        {frequencyLabels[values.paymentFrequency]} ·{' '}
                        {formatTermForFrequency(values.termWeeks, values.paymentFrequency)} ·{' '}
                        {formatInstallmentCount(installments)}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-cream/10 pt-4 text-sm">
                      <div>
                        <p className="text-cream/45">Intereses totales</p>
                        <p className="mt-0.5 font-semibold text-gold">
                          {simulation.isFetching ? '…' : simulation.isSuccess ? formatCurrency(simulation.data.totalInterest) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-cream/45">Total a pagar</p>
                        <p className="mt-0.5 font-semibold">
                          {simulation.isFetching ? '…' : simulation.isSuccess ? formatCurrency(simulation.data.totalPayment) : '—'}
                        </p>
                      </div>
                    </div>
                    {simulation.isError && <p role="alert" className="mt-3 text-sm text-gold">No se pudo calcular la cuota. <button type="button" className="underline" onClick={() => simulation.refetch()}>Reintentar</button></p>}
                    <p className="mt-3 text-[11px] leading-relaxed text-cream/40">
                      Cálculo con un interés total del{' '}
                      {settingsQuery.data?.annualRate ?? 5}% sobre el monto. La cuota final se
                      confirma al aprobar la solicitud.
                    </p>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-forest-700" />
                      <p className="text-sm font-semibold text-forest-950">Documentos</p>
                    </div>
                    <p className="mt-1 text-xs text-ink/45">
                      Solo necesitás adjuntar tu cédula de identidad en PDF, JPG o PNG, de hasta 5 MB.
                      Es obligatoria para enviar; podés guardar el borrador sin adjuntarla.
                    </p>
                    <div className="mt-3 space-y-2">
                      {documentTypes.map((type) => (
                        <div
                          key={type}
                          className="flex flex-col gap-2 rounded-2xl border border-forest-900/10 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 place-items-center rounded-xl bg-forest-50 text-forest-700">
                              {type === 'ID_CARD' ? (
                                <IdCard className="h-4 w-4" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-forest-950">
                                {documentTypeLabels[type]}
                              </p>
                              <p className="break-all text-[11px] text-ink/40">
                                {files[type]?.name || 'Sin archivo seleccionado'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-forest-900/15 px-3 py-1.5 text-xs font-semibold text-forest-700 transition hover:bg-forest-50">
                              <Upload className="h-3.5 w-3.5" />
                              {files[type] ? 'Cambiar' : 'Adjuntar'}
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(event) => {
                                  const file = event.target.files?.[0]
                                  if (file && (file.size > 5 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type))) {
                                    toast.error('La cédula debe ser PDF, JPG o PNG y pesar hasta 5 MB.')
                                    event.target.value = ''
                                    return
                                  }
                                  setFiles((current) => ({
                                    ...current,
                                    [type]: file || null,
                                  }))
                                }}
                              />
                            </label>
                            {files[type] && (
                              <button
                                type="button"
                                onClick={() =>
                                  setFiles((current) => ({ ...current, [type]: null }))
                                }
                                className="rounded-full p-1.5 text-ink/40 hover:bg-red-50 hover:text-red-600"
                                aria-label="Quitar archivo"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-forest-900/10 bg-white p-4">
                    <label className="flex cursor-pointer items-start gap-3 text-sm text-ink/65">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-forest-900/20 text-forest-700 focus:ring-forest-600"
                        {...register('acceptPrivacy')}
                      />
                      <span>
                        Acepto la política de privacidad y el tratamiento de mis datos para evaluar
                        esta solicitud. *
                      </span>
                    </label>
                    {errors.acceptPrivacy && (
                      <p className="text-xs font-medium text-red-600">
                        {errors.acceptPrivacy.message}
                      </p>
                    )}
                    <label className="flex cursor-pointer items-start gap-3 text-sm text-ink/65">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-forest-900/20 text-forest-700 focus:ring-forest-600"
                        {...register('acceptEquifax')}
                      />
                      <span>
                        Autorizo la consulta de referencias crediticias y comerciales para evaluar
                        mi solicitud. *
                      </span>
                    </label>
                    {errors.acceptEquifax && (
                      <p className="text-xs font-medium text-red-600">
                        {errors.acceptEquifax.message}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl bg-forest-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest-600">
                      Resumen
                    </p>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <p className="text-ink/50">
                        Zona:{' '}
                        <span className="font-semibold text-forest-950">{values.community}</span>
                      </p>
                      <p className="text-ink/50">
                        Ocupación:{' '}
                        <span className="font-semibold text-forest-950">{values.occupation}</span>
                      </p>
                      <p className="text-ink/50">
                        Monto:{' '}
                        <span className="font-semibold text-forest-950">
                          {formatCurrency(values.amountRequested)}
                        </span>
                      </p>
                      <p className="text-ink/50">
                        Plazo:{' '}
                        <span className="font-semibold text-forest-950">
                          {formatTermForFrequency(values.termWeeks, values.paymentFrequency)} ·{' '}
                          {formatInstallments(installments, values.paymentFrequency)}
                        </span>
                      </p>
                      <p className="text-ink/50">
                        Frecuencia:{' '}
                        <span className="font-semibold text-forest-950">
                          {frequencyLabels[values.paymentFrequency]}
                        </span>
                      </p>
                      <p className="text-ink/50">
                        Destino:{' '}
                        <span className="font-semibold text-forest-950">{values.purpose}</span>
                      </p>
                      <p className="text-ink/50 sm:col-span-2">
                        Cuota estimada:{' '}
                        <span className="font-semibold text-forest-950">
                          {formatCurrency(simulation.data?.installment)}
                        </span>
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {step > 0 && (
                <Button type="button" variant="ghost" onClick={() => setStep((value) => value - 1)}>
                  <ArrowLeft className="h-4 w-4" /> Anterior
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {step === steps.length - 1 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={saveDraft}
                    loading={mutation.isPending}
                  >
                    Guardar borrador
                  </Button>
                  <Button type="button" onClick={submitApplication} loading={mutation.isPending}>
                    <Send className="h-4 w-4" /> Enviar solicitud
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={next}>
                  Continuar <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
