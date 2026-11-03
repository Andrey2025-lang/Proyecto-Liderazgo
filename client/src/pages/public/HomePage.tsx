import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  FileCheck2,
  HandCoins,
  HeartHandshake,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { api } from '@/lib/api'
import {
  formatCurrency,
  formatInstallmentCount,
  formatInstallments,
  frequencyLabels,
} from '@/lib/format'
import { useAuth } from '@/lib/auth'
import {
  LOAN_AMOUNTS,
  adjustTermForFrequency,
  installmentsForTermWeeks,
  formatTermForFrequency,
  termsForFrequency,
} from '@/lib/loan-options'
import type { Settings, SimulateResult } from '@/lib/types'
import { Button } from '@/components/ui/Button'

const faqs = [
  {
    question: '¿Puedo solicitar si nunca he tenido un crédito?',
    answer:
      'Sí. Evaluamos cada caso de forma individual. Si es tu primer crédito, te pediremos información adicional para conocer tu capacidad de pago y acompañarte en el proceso.',
  },
  {
    question: '¿Cómo se calculan las cuotas?',
    answer:
      'El interés total vigente se aplica una sola vez sobre el monto solicitado y se reparte entre las cuotas. Consultá los montos, plazos e interés actuales en el simulador.',
  },
  {
    question: '¿Qué pasa después de enviar la solicitud?',
    answer:
      'Revisamos tus datos y documentos. Si hace falta información, te la solicitamos por el portal. La aprobación final la realiza el administrador y, si se aprueba, coordinamos el desembolso.',
  },
  {
    question: '¿Puedo pagar en efectivo, SINPE o transferencia?',
    answer:
      'Aceptamos efectivo, transferencia, SINPE Móvil y depósito.',
  },
  {
    question: '¿Qué es Listo Recaudo?',
    answer:
      'Es una referencia de recaudo externa para conciliar pagos. Registramos una referencia manual y permitimos exportar los pagos en CSV.',
  },
]

export function HomePage() {
  const { user, homeForRole } = useAuth()
  const [amount, setAmount] = useState<number>(50000)
  const [termWeeks, setTermWeeks] = useState<number>(8)
  const [frequency, setFrequency] = useState('WEEKLY')
  const installments = installmentsForTermWeeks(termWeeks, frequency)

  const settingsQuery = useQuery<Settings>({
    queryKey: ['public-settings'],
    queryFn: async () => (await api.get('/public/settings')).data,
  })

  const statsQuery = useQuery<{ clients: number; communities: number; years: number }>({
    queryKey: ['public-stats'],
    queryFn: async () => (await api.get('/public/stats')).data,
  })

  const settings = settingsQuery.data
  const loanAmounts = settings?.loanAmounts || [...LOAN_AMOUNTS]
  const frequencyTerms = termsForFrequency(frequency, settings)
  useEffect(() => {
    if (!settings) return
    setAmount((current) => settings.loanAmounts.includes(current) ? current : settings.loanAmounts[0])
    setTermWeeks((current) => adjustTermForFrequency(Math.max(settings.minTerm, Math.min(settings.maxTerm, current)), frequency, settings))
  }, [settings, frequency])

  const simulation = useQuery<SimulateResult>({
    queryKey: ['simulate', amount, termWeeks, frequency, installments, settings?.annualRate],
    queryFn: async () =>
      (
        await api.post('/public/simulate', {
          amount,
          termWeeks,
          termInstallments: installments,
          paymentFrequency: frequency,
        })
      ).data,
    enabled: Boolean(settings && loanAmounts.includes(amount) && frequencyTerms.includes(termWeeks)),
  })
  const startLink = user
    ? user.role === 'CLIENT'
      ? '/app/solicitudes/nueva'
      : homeForRole(user.role)
    : '/registro'
  const startLabel = user
    ? user.role === 'CLIENT'
      ? 'Continuar mi solicitud'
      : 'Ir a mi portal'
    : 'Crear cuenta para solicitar'
  const contactPhones = [
    settings?.contactPhone || '8515-7835',
    settings?.contactPhone2 || '6272-2143',
    settings?.contactPhone3 || '8812-6956',
  ]

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-32 -top-20 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-forest-300/30 blur-3xl" />
        <div className="container-page relative grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-forest-900/10 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-forest-700 shadow-sm">
              <MapPin className="h-3.5 w-3.5 text-gold" />
              Desde 2018 acompañando a la Península de Nicoya
            </div>
            <h1 className="mt-5 max-w-2xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-forest-950 sm:text-6xl">
              Crédito cercano,{' '}
              <span className="relative whitespace-nowrap text-forest-700">
                claro
                <svg
                  className="absolute -bottom-1 left-0 w-full text-gold/70"
                  viewBox="0 0 120 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 9C27 3 61 2 117 6"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{' '}
              y a tu ritmo.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/65">
              Préstamos personales con acompañamiento real: te explicamos las condiciones, te
              ayudamos a elegir un plazo cómodo y te acompañamos durante todo el camino.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={startLink}>
                <Button size="lg">
                  {startLabel} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/como-funciona">
                <Button variant="outline" size="lg">
                  Ver cómo funciona
                </Button>
              </Link>
            </div>
            <p className="mt-3 text-xs text-ink/45">
              Las solicitudes se realizan únicamente dentro de tu cuenta. El sitio público es
              informativo.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink/55">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-forest-600" />
                Datos tratados con cuidado
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-forest-600" />
                Respuesta en días hábiles
              </span>
              <span className="inline-flex items-center gap-2">
                <HeartHandshake className="h-4 w-4 text-forest-600" />
                Trato humano, sin letra pequeña
              </span>
            </div>
          </div>

          <div className="relative animate-fade-up [animation-delay:150ms]">
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-forest-200/70 via-cream to-gold/20 blur-2xl" />
            <div className="rounded-4xl border border-forest-900/10 bg-white p-5 shadow-soft sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="eyebrow">Simulador</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-forest-950">
                    Calculá tu cuota
                  </h2>
                </div>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-forest-50 text-forest-700">
                  <Wallet className="h-6 w-6" />
                </span>
              </div>

              <div className="mt-6">
                <div className="flex items-end justify-between gap-3">
                  <span className="text-sm font-semibold text-forest-900">Monto del préstamo</span>
                  <span className="font-display text-xl font-semibold text-forest-950">
                    {formatCurrency(amount)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {loanAmounts.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAmount(value)}
                      aria-pressed={amount === value}
                      aria-label={`Seleccionar ${formatCurrency(value)}`}
                      className={`rounded-2xl border px-2 py-3 text-center text-sm font-semibold transition ${
                        amount === value
                          ? 'border-forest-900 bg-forest-900 text-cream'
                          : 'border-forest-900/15 bg-white text-forest-900 hover:border-forest-600 hover:bg-forest-50'
                      }`}
                    >
                      {formatCurrency(value)}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-ink/40">
                  Montos disponibles: {loanAmounts.map((value) => formatCurrency(value)).join(', ')}.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-forest-900" htmlFor="term">
                    Plazo
                  </label>
                  <select
                    id="term"
                    value={termWeeks}
                    onChange={(event) => setTermWeeks(Number(event.target.value))}
                    className="input-base mt-2 py-2.5"
                  >
                    {frequencyTerms.map((value) => (
                      <option key={value} value={value}>
                        {formatTermForFrequency(value, frequency)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-ink/40">
                    {formatInstallments(installments, frequency)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-forest-900" htmlFor="frequency">
                    Frecuencia
                  </label>
                  <select
                    id="frequency"
                    value={frequency}
                    onChange={(event) => {
                      const next = event.target.value
                      setFrequency(next)
                      setTermWeeks((current) => adjustTermForFrequency(current, next, settings))
                    }}
                    className="input-base mt-2 py-2.5"
                  >
                    <option value="WEEKLY">Semanal</option>
                    <option value="BIWEEKLY" disabled={termsForFrequency('BIWEEKLY', settings).length === 0}>Quincenal</option>
                    <option value="MONTHLY" disabled={termsForFrequency('MONTHLY', settings).length === 0}>Mensual</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 rounded-3xl bg-forest-950 p-5 text-cream">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cream/50">
                  Cuota estimada
                </p>
                <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
                  <p className="font-display text-4xl font-semibold tracking-tight">
                    {simulation.isFetching ? '…' : simulation.isSuccess ? formatCurrency(simulation.data.installment) : '—'}
                  </p>
                  <span className="rounded-full bg-cream/10 px-3 py-1 text-xs text-cream/70">
                    {frequencyLabels[frequency]} · {formatTermForFrequency(termWeeks, frequency)} ·{' '}
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
              </div>
              {(settingsQuery.isError || simulation.isError) && (
                <div role="alert" className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
                  No se pudo calcular la cuota. Revisá la conexión e intentá de nuevo.
                  <button type="button" className="ml-2 font-semibold underline" onClick={() => settingsQuery.isError ? settingsQuery.refetch() : simulation.refetch()}>Reintentar</button>
                </div>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-ink/40">
                Cálculo con un interés total configurable del{' '}
                {settings?.annualRate ?? 5}% sobre el monto. La cuota final puede variar según la
                evaluación y las condiciones acordadas.
              </p>
              <Link to={startLink} className="mt-4 block">
                <Button className="w-full" size="lg">
                  {startLabel} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <p className="mt-2 text-center text-[11px] text-ink/40">
                Si todavía no tenés cuenta, el botón te lleva al registro.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-forest-900/10 bg-white/60">
        <div className="container-page grid grid-cols-2 gap-6 py-8 sm:grid-cols-4">
          {[
            { value: '2018', label: 'Año de fundación' },
            { value: `${statsQuery.data?.communities ?? 6}`, label: 'Comunidades atendidas' },
            { value: `${Math.max(statsQuery.data?.years ?? 8, 1)}+`, label: 'Años de experiencia' },
            { value: '1 a 1', label: 'Acompañamiento personal' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="font-display text-3xl font-semibold text-forest-950">{item.value}</p>
              <p className="mt-1 text-xs font-medium text-ink/50">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow">Así de simple</p>
          <h2 className="section-title mt-2">Un proceso pensado para personas reales</h2>
          <p className="mt-4 text-base leading-relaxed text-ink/60">
            Sin trámites interminables ni sorpresas. Te mostramos cada paso antes de avanzar y
            puedes revisar el estado de tu solicitud desde tu portal.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              step: '01',
              icon: FileCheck2,
              title: 'Completá tu solicitud',
              text: 'Creá tu cuenta, contanos qué necesitás y adjuntá únicamente tu cédula de identidad.',
            },
            {
              step: '02',
              icon: Sparkles,
              title: 'Revisamos tu caso',
              text: 'Analizamos tu información con cuidado. Si falta algo, te lo pedimos por el portal.',
            },
            {
              step: '03',
              icon: HandCoins,
              title: 'Coordinamos el desembolso',
              text: 'Si todo está en orden, aprobamos tu préstamo y coordinamos la entrega y el plan de pagos.',
            },
          ].map((item) => (
            <div key={item.step} className="group relative rounded-4xl border border-forest-900/10 bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-soft">
              <span className="absolute right-6 top-5 font-display text-4xl font-semibold text-forest-900/10">
                {item.step}
              </span>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-forest-50 text-forest-700 transition group-hover:bg-forest-900 group-hover:text-cream">
                <item.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold text-forest-950">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-forest-950 py-16 text-cream sm:py-24">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">
              Requisitos claros
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Sabés qué necesitás desde el primer día.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-cream/60">
              Pedimos lo justo para conocerte y evaluar tu capacidad de pago. Nada de documentos
              innecesarios ni datos sensibles que no necesitemos para tu crédito.
            </p>
            <Link to="/requisitos" className="mt-7 inline-block">
              <Button variant="gold" size="lg">
                Ver requisitos completos <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Check, label: 'Cédula de identidad vigente' },
              { icon: Check, label: 'Mayor de edad y residente en la zona' },
              { icon: Check, label: 'Una sola solicitud en proceso por persona' },
              { icon: Check, label: 'Si tenés un préstamo activo, solo renovación' },
              { icon: Check, label: 'Cuenta o medio para recibir el desembolso' },
              { icon: Check, label: 'Autorización de consulta de referencias' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-3xl border border-cream/10 bg-cream/5 p-4 text-sm text-cream/75"
              >
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                  <item.icon className="h-3.5 w-3.5" />
                </span>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16 sm:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="order-2 lg:order-1">
            <p className="eyebrow">Servicios y contacto</p>
            <h2 className="section-title mt-2">Préstamos J&C, cerca de tu comunidad.</h2>
            <p className="mt-4 text-base leading-relaxed text-ink/60">
              Préstamos personales sin fiador y sin garantía, con pagos diarios, semanales o
              quincenales. La solicitud se realiza dentro de tu cuenta para proteger tus datos y
              darte seguimiento.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {loanAmounts.map((value) => (
                <div
                  key={value}
                  className="rounded-2xl border border-forest-900/10 bg-white px-2 py-3 text-center shadow-sm"
                >
                  <p className="font-display text-lg font-semibold text-forest-950">
                    {formatCurrency(value)}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-ink/40">
                    Monto disponible
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-3xl bg-forest-950 p-5 text-cream">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-cream/10 text-gold">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Llamanos o escribinos</p>
                  <p className="text-xs text-cream/50">Horario de atención del equipo</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {contactPhones.map((phone) => (
                  <a
                    key={phone}
                    href={`tel:${phone.replace(/\D/g, '')}`}
                    className="rounded-full border border-cream/15 bg-cream/5 px-3 py-1.5 text-sm font-semibold text-cream/85 transition hover:bg-cream/10"
                  >
                    {phone}
                  </a>
                ))}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/requisitos">
                <Button variant="outline">Ver requisitos</Button>
              </Link>
              <Link to={startLink}>
                <Button>{startLabel}</Button>
              </Link>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-gold/20 to-forest-200/60 blur-2xl" />
              <div className="rounded-4xl border border-forest-900/10 bg-white p-3 shadow-soft sm:p-4">
                <img
                  src="/prestamos-jyc-logo.png"
                  alt="Logo de Préstamos J&C."
                  className="w-full rounded-3xl object-contain mix-blend-multiply"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page overflow-hidden py-16 sm:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-gold/20 to-forest-200/50 blur-2xl" />
            <div className="rounded-4xl border border-forest-900/10 bg-white p-7 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-forest-50 text-forest-700">
                  <CalendarDays className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">
                    Después de aprobar
                  </p>
                  <p className="font-display text-xl font-semibold text-forest-950">
                    Tu plan, siempre visible
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  'Desembolso coordinado con el equipo',
                  'Plan de pagos con fechas y montos claros',
                  'Registro de cada pago y saldo actualizado',
                  'Acompañamiento de tu cobrador asignado',
                ].map((text) => (
                  <div key={text} className="flex items-start gap-3 text-sm text-ink/65">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest-100 text-forest-700">
                      <Check className="h-3 w-3" />
                    </span>
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="eyebrow">Acompañamiento</p>
            <h2 className="section-title mt-2">
              No se trata solo de un préstamo. Se trata de cómo lo vivís.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink/60">
              En J&C creemos que una decisión financiera debe explicarse en palabras sencillas.
              Por eso te mostramos la cuota, los intereses y el total antes de firmar, y te
              acompañamos si necesitás ajustar tu plan.
            </p>
            <blockquote className="mt-6 rounded-3xl border-l-4 border-gold bg-forest-50 p-5 font-display text-xl italic leading-relaxed text-forest-900">
              “Un crédito bien explicado es un crédito que se puede cumplir.”
            </blockquote>
            <Link to="/preguntas" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-forest-700 hover:text-forest-900">
              Leer preguntas frecuentes <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-forest-900/10 bg-white/60 py-16 sm:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow">Preguntas frecuentes</p>
            <h2 className="section-title mt-2">Lo que más nos consultan</h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/55">
              Si tu duda no aparece aquí, escribinos a{' '}
              {settings?.contactEmail || 'info@jycprestamos.cr'} o llamanos al{' '}
              {contactPhones[0]}.
            </p>
            <Link to="/preguntas" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-forest-700 hover:text-forest-900">
              Ver todas las preguntas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-forest-900/10 rounded-3xl border border-forest-900/10 bg-white">
            {faqs.slice(0, 4).map((faq) => (
              <details key={faq.question} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-forest-950">
                  {faq.question}
                  <ChevronDown className="h-4 w-4 shrink-0 text-forest-500 transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink/60">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16 sm:py-24">
        <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-forest-900 to-forest-950 px-6 py-12 text-center text-cream sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-forest-400/20 blur-2xl" />
          <p className="relative text-xs font-bold uppercase tracking-[0.22em] text-gold">
            Empezá hoy
          </p>
          <h2 className="relative mx-auto mt-3 max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Tu próximo paso puede ser más claro.
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cream/60 sm:text-base">
            Creá tu cuenta, completá tu solicitud y revisá el estado en línea. Sin compromiso y
            sin costo por solicitar.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link to={startLink}>
              <Button variant="gold" size="lg">
                {startLabel} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {!user && (
              <Link to="/login">
                <Button variant="outline" size="lg" className="border-cream/25 text-cream hover:bg-cream/10">
                  Ya tengo cuenta
                </Button>
              </Link>
            )}
          </div>
          <p className="relative mt-4 text-xs text-cream/40">
            El formulario de solicitud solo está disponible después de iniciar sesión.
          </p>
        </div>
      </section>
    </div>
  )
}
