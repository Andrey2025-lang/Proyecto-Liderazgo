import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  ClipboardCheck,
  FileSearch,
  HandCoins,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { Button } from '@/components/ui/Button'

const steps = [
  {
    icon: ClipboardCheck,
    title: 'Creá tu cuenta',
    text: 'Registrate con tu correo y cédula. Solo necesitás unos minutos y un teléfono de contacto.',
  },
  {
    icon: FileSearch,
    title: 'Completá la solicitud',
    text: 'Indicá el monto, el plazo y la frecuencia de pago que te acomodan. Adjuntá solo tu cédula de identidad. Si tenés un préstamo activo, solicitá una renovación.',
  },
  {
    icon: MessageCircle,
    title: 'Revisión y comunicación',
    text: 'Nuestro equipo revisa tu información. Si falta algo, te lo solicitamos por el portal para no hacerte ir y venir.',
  },
  {
    icon: BadgeCheck,
    title: 'Decisión clara',
    text: 'El administrador toma la decisión final. Si se aprueba, te mostramos el monto, el interés total, la cuota y las fechas.',
  },
  {
    icon: HandCoins,
    title: 'Desembolso coordinado',
    text: 'Coordinamos la entrega del dinero y te asignamos un cobrador para acompañarte durante el crédito.',
  },
  {
    icon: CalendarCheck,
    title: 'Pagá y seguí tu saldo',
    text: 'Cada pago queda registrado. Podés consultar tu plan, tus cuotas pagadas y tu saldo pendiente en línea.',
  },
]

export function HowItWorksPage() {
  return (
    <div>
      <PageHero
        eyebrow="Cómo funciona"
        title="De la solicitud al pago, sin sorpresas."
        description="Te explicamos cada etapa del proceso para que sepas qué esperar, qué documentos necesitás y cómo se toman las decisiones."
      >
        <div className="flex flex-wrap gap-3">
          <Link to="/registro">
            <Button size="lg">
              Crear cuenta para solicitar <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/requisitos">
            <Button variant="outline" size="lg">
              Ver requisitos
            </Button>
          </Link>
        </div>
        <p className="mt-3 text-xs text-ink/45">
          El formulario de solicitud solo está disponible después de iniciar sesión.
        </p>
      </PageHero>

      <section className="container-page py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">Paso a paso</p>
          <h2 className="section-title mt-2">Un camino claro, con acompañamiento</h2>
          <p className="mt-4 text-base leading-relaxed text-ink/60">
            Cada etapa tiene un propósito. No avanzamos sin que entiendas las condiciones y sin
            que tengamos la información necesaria para evaluar tu caso.
          </p>
        </div>
        <div className="relative mt-10">
          <div className="absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-forest-300 via-forest-200 to-transparent sm:block" />
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="relative flex flex-col gap-4 rounded-3xl border border-forest-900/10 bg-white p-5 shadow-card sm:ml-14 sm:flex-row sm:items-start sm:p-6"
              >
                <span className="absolute -left-14 top-6 hidden h-11 w-11 place-items-center rounded-full border-4 border-cream bg-forest-900 text-sm font-bold text-cream sm:grid">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-forest-50 text-forest-700">
                  <step.icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold text-forest-950">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-forest-900/10 bg-white/60 py-16">
        <div className="container-page grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Wallet,
              title: 'Capacidad de pago',
              text: 'Revisamos ingresos, gastos y la cuota que podés asumir sin comprometer tu estabilidad.',
            },
            {
              icon: ShieldCheck,
              title: 'Referencias y comportamiento',
              text: 'Consideramos tu historial de pago y referencias. Si es tu primer crédito, buscamos otras señales de confianza.',
            },
            {
              icon: HeartHandshake,
              title: 'Estabilidad y arraigo',
              text: 'Valoramos tu vínculo con la comunidad, tu actividad económica y la posibilidad de acompañarte en el tiempo.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-forest-900/10 bg-white p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-forest-50 text-forest-700">
                <item.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-forest-950">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-10 rounded-4xl bg-forest-950 p-7 text-cream sm:p-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">
              Transparencia
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Antes de aceptar, vas a saber cuánto pagás.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-cream/60">
              El simulador es una referencia. Cuando tu solicitud sea aprobada, el portal te
              mostrará el monto aprobado, el interés total, la cuota, el total de intereses y las
              fechas de pago.
            </p>
          </div>
          <div className="space-y-3">
            {[
              'Monto solicitado y monto aprobado',
              'Interés total y costo del crédito',
              'Cuota, frecuencia y fechas de pago',
              'Saldo pendiente actualizado después de cada pago',
              'Registro de pagos y recibos',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 text-sm text-cream/70">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                  <BadgeCheck className="h-3.5 w-3.5" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
