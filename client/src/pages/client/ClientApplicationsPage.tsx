import { Link } from 'react-router-dom'
import { PaginatedList } from '@/components/ui/Pagination'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, FilePlus2, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import {
  formatCurrency,
  formatDate,
  formatInstallments,
} from '@/lib/format'
import { formatTermForFrequency } from '@/lib/loan-options'
import type { Application } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingBlock } from '@/components/ui/Spinner'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'

export function ClientApplicationsPage() {
  const applicationsQuery = useQuery<Application[]>({
    queryKey: ['my-applications'],
    queryFn: async () => (await api.get('/applications/me')).data,
  })

  if (applicationsQuery.isLoading) return <LoadingBlock label="Cargando tus solicitudes…" />

  const applications = applicationsQuery.data || []
  const pending = applications.find((item) => ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'RECOMMENDED'].includes(item.status))

  return (
    <div>
      <PageHeader
        eyebrow="Solicitudes"
        title="Mis solicitudes"
        description="Revisá el estado de cada solicitud y los documentos que adjuntaste."
        actions={
          <Link to={pending ? `/app/solicitudes/${pending.id}` : '/app/solicitudes/nueva'}>
            <Button>
              <FilePlus2 className="h-4 w-4" /> {pending ? 'Ver solicitud en proceso' : 'Nueva solicitud'}
            </Button>
          </Link>
        }
      />

      {applications.length === 0 ? (
        <EmptyState
          title="Todavía no tenés solicitudes"
          description="Cuando completes el formulario, vas a poder seguir el proceso desde aquí."
          action={
            <Link to="/app/solicitudes/nueva">
              <Button>Empezar mi solicitud</Button>
            </Link>
          }
        />
      ) : (
        <PaginatedList label="Mis solicitudes" className="space-y-4">
          {applications.map((application) => (
            <Link
              key={application.id}
              to={`/app/solicitudes/${application.id}`}
              className="block rounded-3xl border border-forest-900/10 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-forest-300 hover:shadow-soft sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-forest-50 text-forest-700">
                    <FileText className="h-6 w-6" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-xl font-semibold text-forest-950">
                        {formatCurrency(application.amountRequested)}
                      </p>
                      <StatusBadge status={application.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink/50">
                      {formatTermForFrequency(application.termWeeks, application.paymentFrequency)} ·{' '}
                      {formatInstallments(application.termInstallments, application.paymentFrequency)}{' '}
                      · Creada el{' '}
                      {formatDate(application.createdAt)}
                    </p>
                    {application.purpose && (
                      <p className="mt-2 line-clamp-1 text-sm text-ink/60">{application.purpose}</p>
                    )}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700">
                  Ver detalle <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </PaginatedList>
      )}
    </div>
  )
}
