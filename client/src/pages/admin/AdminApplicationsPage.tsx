import { useState } from 'react'
import { PaginatedTable } from '@/components/ui/Pagination'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ClipboardList, Search } from 'lucide-react'
import { api } from '@/lib/api'
import {
  formatCurrency,
  formatDate,
  formatInstallmentCount,
  frequencyLabels,
} from '@/lib/format'
import { formatTermForFrequency } from '@/lib/loan-options'
import type { Application } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingBlock } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'SUBMITTED', label: 'Recibidas' },
  { value: 'UNDER_REVIEW', label: 'En revisión' },
  { value: 'INFO_REQUESTED', label: 'Información solicitada' },
  { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
  { value: 'DRAFT', label: 'Borradores' },
]

export function AdminApplicationsPage() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  const applicationsQuery = useQuery<Application[]>({
    queryKey: ['admin-applications', status, search],
    queryFn: async () =>
      (
        await api.get('/applications', {
          params: { status: status || undefined, search: search || undefined },
        })
      ).data,
  })

  const applications = applicationsQuery.data || []
  const pending = applications.filter((item) =>
    ['SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED'].includes(item.status),
  ).length

  return (
    <div>
      <PageHeader
        eyebrow="Solicitudes"
        title="Bandeja de solicitudes"
        description="Revisá, solicitá información y tomá decisiones sobre las solicitudes de crédito."
      />

      <Card className="mb-5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <Input
              className="pl-11"
              placeholder="Buscar por nombre, correo o cédula…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="sm:w-56">
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="rounded-full bg-forest-50 px-4 py-2 text-center text-xs font-semibold text-forest-700">
            {pending} por atender
          </div>
        </CardContent>
      </Card>

      {applicationsQuery.isLoading ? (
        <LoadingBlock label="Cargando solicitudes…" />
      ) : applications.length === 0 ? (
        <EmptyState
          title="No hay solicitudes con ese filtro"
          description="Probá con otro estado o limpiá la búsqueda."
          action={<ClipboardList className="h-5 w-5 text-forest-400" />}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <PaginatedTable label="Solicitudes" className="table-base min-w-[900px]">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Monto</th>
                  <th>Plazo</th>
                  <th>Frecuencia</th>
                  <th>Recibida</th>
                  <th>Estado</th>
                  <th>Documentos</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id}>
                    <td>
                      <div>
                        <p className="font-semibold text-forest-950">{application.client?.name}</p>
                        <p className="text-xs text-ink/45">
                          {application.client?.profile?.cedula} ·{' '}
                          {application.client?.profile?.community || 'Sin comunidad'}
                        </p>
                      </div>
                    </td>
                    <td className="font-semibold text-forest-950">
                      {formatCurrency(application.amountRequested)}
                    </td>
                    <td>
                      {formatTermForFrequency(application.termWeeks, application.paymentFrequency)} ·{' '}
                      {formatInstallmentCount(application.termInstallments)}
                    </td>
                    <td>{frequencyLabels[application.paymentFrequency]}</td>
                    <td>{formatDate(application.submittedAt || application.createdAt)}</td>
                    <td>
                      <StatusBadge status={application.status} />
                    </td>
                    <td>
                      <span className="text-xs text-ink/50">
                        {application._count?.documents ?? application.documents?.length ?? 0}
                      </span>
                    </td>
                    <td className="text-right">
                      <Link
                        to={`/admin/solicitudes/${application.id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:text-forest-900"
                      >
                        Revisar <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </PaginatedTable>
          </div>
        </Card>
      )}
    </div>
  )
}
