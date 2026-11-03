import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ClipboardList,
  CreditCard,
  FileText,
  IdCard,
  MapPin,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { Button } from '@/components/ui/Button'

const requirements = [
  {
    icon: UserCheck,
    title: 'Mayor de edad',
    text: 'Tener al menos 18 años cumplidos y capacidad legal para contratar.',
  },
  {
    icon: MapPin,
    title: 'Residencia en la zona',
    text: 'Vivir o trabajar en las comunidades de la Península de Nicoya y zonas cercanas.',
  },
  {
    icon: CreditCard,
    title: 'Capacidad de pago',
    text: 'Contar con ingresos o una actividad económica que permita asumir la cuota.',
  },
  {
    icon: IdCard,
    title: 'Identificación vigente',
    text: 'Presentar cédula de identidad costarricense vigente y legible.',
  },
]

const documents = [
  { title: 'Cédula de identidad', detail: 'Ambas caras, vigente y legible.' },
]

export function RequirementsPage() {
  return (
    <div>
      <PageHero
        eyebrow="Requisitos"
        title="Lo justo para conocerte y evaluar tu caso."
        description="El único documento requerido es tu cédula de identidad. Completá tus datos y elegí las condiciones del préstamo. Solo podés tener una solicitud en proceso; si ya tenés un préstamo activo, solicitá su renovación."
      >
        <Link to="/registro">
          <Button size="lg">
            Crear cuenta para solicitar <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <p className="mt-3 text-xs text-ink/45">
          El formulario de solicitud solo está disponible después de iniciar sesión.
        </p>
      </PageHero>

      <section className="container-page py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">Requisitos generales</p>
          <h2 className="section-title mt-2">Antes de empezar, revisá esto</h2>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {requirements.map((item) => (
            <div key={item.title} className="flex gap-4 rounded-3xl border border-forest-900/10 bg-white p-5 shadow-card">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-forest-50 text-forest-700">
                <item.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-forest-950">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink/60">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-forest-900/10 bg-white/60 py-16">
        <div className="container-page grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="eyebrow">Documentos</p>
            <h2 className="section-title mt-2">Qué podés ir preparando</h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/60">
              En el formulario de solicitud vas a poder adjuntar archivos PDF, JPG o PNG. Si no
              tenés algún documento a mano, podés guardar tu borrador y completarlo después.
            </p>
            <div className="mt-5 rounded-3xl bg-forest-50 p-4 text-sm text-forest-900">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Evitá compartir datos sensibles que no sean necesarios para evaluar el crédito.
                  No solicitamos dictamen médico.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {documents.map((doc) => (
              <div key={doc.title} className="rounded-2xl border border-forest-900/10 bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-forest-100 text-forest-700">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-sm font-semibold text-forest-950">{doc.title}</p>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink/55">{doc.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: FileText,
              title: 'Solicitud en línea',
              text: 'Completá el formulario por pasos. Podés guardar un borrador y continuar después.',
            },
            {
              icon: ClipboardList,
              title: 'Revisión humana',
              text: 'Una persona del equipo revisa tu caso. Si falta información, te lo comunica por el portal.',
            },
            {
              icon: ShieldCheck,
              title: 'Consentimiento informado',
              text: 'Te pedimos autorización para tratar tus datos y consultar referencias. Podés consultar nuestra política de privacidad.',
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

      <section className="container-page pb-16">
        <div className="rounded-4xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-800">
            Sobre las condiciones
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-amber-900/80">
            El interés total y las condiciones vigentes se muestran actualizados en el simulador.
            La aprobación final está sujeta a la evaluación del equipo de J&C.
          </p>
        </div>
      </section>
    </div>
  )
}
