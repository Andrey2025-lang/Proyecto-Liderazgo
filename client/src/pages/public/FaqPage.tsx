import { Link } from 'react-router-dom'
import { ArrowRight, Mail, MessageCircle, Phone } from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { Button } from '@/components/ui/Button'

const faqs = [
  {
    question: '¿Puedo enviar varias solicitudes o pedir otro préstamo si ya tengo uno activo?',
    answer: 'Solo podés tener una solicitud en proceso, incluyendo borradores y renovaciones. Si ya tenés un préstamo activo, únicamente podés solicitar su renovación, sujeta a aprobación manual.',
  },
  {
    question: '¿Qué documento debo adjuntar?',
    answer: 'Únicamente tu cédula de identidad vigente y legible, en PDF, JPG o PNG de hasta 5 MB. Podés guardar el borrador sin archivo, pero debés adjuntarla antes de enviar.',
  },
  {
    question: '¿Qué montos puedo solicitar?',
    answer:
      'Los montos disponibles se muestran actualizados en el simulador de inicio. Podés solicitar desde tu cuenta o con asistencia del equipo de recepción.',
  },
  {
    question: '¿Qué plazos y frecuencias puedo elegir?',
    answer:
      'Podés elegir los plazos en semanas habilitados en el simulador. Los pagos pueden ser semanales, quincenales o mensuales; la cantidad de cuotas se ajusta a la frecuencia seleccionada.',
  },
  {
    question: '¿Puedo solicitar si nunca he tenido un crédito?',
    answer:
      'Sí. Evaluamos cada caso de forma individual. Si es tu primer crédito, podemos pedirte información adicional sobre tus ingresos, tu actividad económica y referencias para conocer mejor tu situación.',
  },
  {
    question: '¿Cómo se calculan las cuotas?',
    answer:
      'Aplicamos una sola vez el porcentaje de interés total vigente sobre el monto solicitado y lo repartimos entre las cuotas. El simulador muestra el porcentaje actual y el total a pagar. Las condiciones finales se confirman al aprobar la solicitud.',
  },
  {
    question: '¿Qué significa que el interés total sea configurable?',
    answer:
      'El interés total vigente lo define el administrador en la configuración. Las condiciones se comunican claramente antes de contratar y se confirman al aprobar la solicitud.',
  },
  {
    question: '¿Qué pasa después de enviar la solicitud?',
    answer:
      'La solicitud pasa a revisión. El equipo puede marcarla en revisión, solicitar información adicional o tomar una decisión. La aprobación final la realiza el administrador. Si se aprueba, se genera un plan de pagos y se coordina el desembolso.',
  },
  {
    question: '¿Puedo editar mi solicitud?',
    answer:
      'Mientras esté en borrador, sí. Una vez enviada, no se edita directamente; si necesitás corregir algo, el equipo puede solicitar información adicional o indicarte cómo continuar.',
  },
  {
    question: '¿Cómo se registran los pagos?',
    answer:
      'Un usuario interno registra el pago con fecha, monto, método y referencia. El sistema lo aplica a las cuotas pendientes y actualiza el saldo. También permite anular un pago con motivo y auditoría.',
  },
  {
    question: '¿Qué es Listo Recaudo y por qué aparece una referencia?',
    answer:
      'Listo Recaudo es una referencia de recaudo externa. Como no contamos con su API en esta versión, el sistema permite ingresar un número de recibo o referencia manual y exportar los pagos en CSV. Queda preparado para una integración futura.',
  },
  {
    question: '¿Cómo se coordina el desembolso?',
    answer:
      'Una vez aprobada la solicitud, el equipo coordina el desembolso y genera el plan de pagos correspondiente.',
  },
]

export function FaqPage() {
  return (
    <div>
      <PageHero
        eyebrow="Preguntas frecuentes"
        title="Respuestas claras antes de dar el siguiente paso."
        description="Reunimos las dudas más comunes sobre el proceso, los requisitos, las cuotas y el uso de tus datos."
      />

      <section className="container-page py-16 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="divide-y divide-forest-900/10 overflow-hidden rounded-4xl border border-forest-900/10 bg-white shadow-card">
            {faqs.map((faq) => (
              <details key={faq.question} className="group px-5 py-5 sm:px-6">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                  <span className="font-display text-lg font-semibold text-forest-950">
                    {faq.question}
                  </span>
                  <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-forest-50 text-forest-700 transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/60">{faq.answer}</p>
              </details>
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-forest-950 p-6 text-cream">
              <MessageCircle className="h-7 w-7 text-gold" />
              <h3 className="mt-4 font-display text-2xl font-semibold">¿Tenés otra duda?</h3>
              <p className="mt-2 text-sm leading-relaxed text-cream/60">
                Escribinos o llamanos. Podemos explicarte el proceso sin compromiso.
              </p>
              <div className="mt-5 space-y-3 text-sm">
                {['8515-7835', '6272-2143', '8812-6956'].map((phone) => (
                  <a
                    key={phone}
                    href={`tel:${phone.replace(/\D/g, '')}`}
                    className="flex items-center gap-2 text-cream/75 hover:text-cream"
                  >
                    <Phone className="h-4 w-4 text-gold" /> {phone}
                  </a>
                ))}
                <a
                  href="mailto:info@jycprestamos.cr"
                  className="flex items-center gap-2 text-cream/75 hover:text-cream"
                >
                  <Mail className="h-4 w-4 text-gold" /> info@jycprestamos.cr
                </a>
              </div>
            </div>
            <div className="rounded-3xl border border-forest-900/10 bg-white p-6">
              <p className="eyebrow">Privacidad</p>
              <h3 className="mt-2 font-display text-xl font-semibold text-forest-950">
                Tus datos, con cuidado
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                Usamos tu información para evaluar la solicitud y gestionar el crédito. Podés
                consultar cómo la tratamos en nuestra política de privacidad.
              </p>
              <Link
                to="/privacidad"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest-700 hover:text-forest-900"
              >
                Leer política <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pb-16">
        <div className="rounded-4xl bg-forest-50 p-7 text-center sm:p-10">
          <h2 className="font-display text-3xl font-semibold text-forest-950">
            ¿Listo para empezar?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ink/60">
            Creá tu cuenta y completá la solicitud en línea. Podés revisar el estado en cualquier
            momento desde tu portal.
          </p>
          <Link to="/registro" className="mt-6 inline-block">
            <Button size="lg">
              Crear cuenta para solicitar <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-3 text-xs text-ink/40">
            El formulario de solicitud solo está disponible después de iniciar sesión.
          </p>
        </div>
      </section>
    </div>
  )
}
