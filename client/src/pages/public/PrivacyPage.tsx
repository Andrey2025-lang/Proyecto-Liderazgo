import {
  Eye,
  LockKeyhole,
  Mail,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  UserCheck,
} from 'lucide-react'
import { PageHero } from '@/components/PageHero'

const sections = [
  {
    icon: Eye,
    title: 'Qué datos recopilamos',
    content:
      'Datos de identificación y contacto (nombre, cédula, correo, teléfono, dirección y comunidad), información laboral y de ingresos, documentos que adjuntes voluntariamente, y registros de tu actividad en el portal (solicitudes, préstamos, pagos y notificaciones).',
  },
  {
    icon: UserCheck,
    title: 'Para qué los usamos',
    content:
      'Para crear y administrar tu cuenta, evaluar tu solicitud, gestionar el préstamo y los pagos, comunicarnos con vos, cumplir obligaciones legales y mejorar la experiencia del portal. No usamos tus datos para fines distintos sin informarte.',
  },
  {
    icon: ShieldCheck,
    title: 'Consentimiento y referencias',
    content:
      'Al enviar una solicitud nos autorizás a tratar tus datos para la evaluación crediticia y, cuando corresponda, a consultar referencias. Podés retirar tu consentimiento para usos no esenciales escribiéndonos, sin afectar la gestión del crédito ya contratado.',
  },
  {
    icon: LockKeyhole,
    title: 'Seguridad',
    content:
      'Aplicamos medidas razonables para proteger la información: contraseñas cifradas, sesiones con cookies HttpOnly, control de acceso por roles y registro de auditoría de acciones internas. Ningún sistema es completamente infalible; si detectás un incidente, contactanos de inmediato.',
  },
  {
    icon: RefreshCcw,
    title: 'Conservación',
    content:
      'Conservamos la información mientras tu cuenta esté activa y durante los plazos necesarios para atender obligaciones legales, contables o de auditoría. Luego la eliminamos o anonimizamos de forma segura.',
  },
  {
    icon: Trash2,
    title: 'Tus derechos',
    content:
      'Podés solicitar acceso, rectificación, actualización o eliminación de tus datos, así como oponerte a ciertos tratamientos. Escribinos a info@jycprestamos.cr y te responderemos en un plazo razonable.',
  },
]

export function PrivacyPage() {
  return (
    <div>
      <PageHero
        eyebrow="Privacidad y datos"
        title="Tu información se trata con cuidado y transparencia."
        description="Esta política describe cómo Préstamos J&C recopila y utiliza los datos."
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-forest-700 shadow-sm">
          <ShieldCheck className="h-4 w-4" /> Versión: octubre 2026
        </div>
      </PageHero>

      <section className="container-page py-16">
        <div className="grid gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <div key={section.title} className="rounded-3xl border border-forest-900/10 bg-white p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-forest-50 text-forest-700">
                <section.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-display text-xl font-semibold text-forest-950">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{section.content}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-4xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-amber-950">
            Sobre esta política
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-amber-900/80">
            Préstamos J&C protege la información que compartís con nosotros. Esta política se revisa
            periódicamente para mantenerla alineada con la normativa aplicable en Costa Rica y con
            nuestros procedimientos internos.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-3xl bg-forest-950 p-6 text-cream sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-xl font-semibold">¿Querés ejercer tus derechos?</p>
            <p className="mt-1 text-sm text-cream/60">
              Escribinos y con gusto te orientamos.
            </p>
          </div>
          <a
            href="mailto:info@jycprestamos.cr"
            className="inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-white"
          >
            <Mail className="h-4 w-4" /> info@jycprestamos.cr
          </a>
        </div>
      </section>
    </div>
  )
}
