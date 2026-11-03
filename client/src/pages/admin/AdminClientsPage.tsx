import { useState } from 'react'
import { PaginatedTable } from '@/components/ui/Pagination'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Search, UsersRound } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import type { User } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingBlock } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'

export function AdminClientsPage() {
  const [search, setSearch] = useState('')
  const clientsQuery = useQuery<User[]>({
    queryKey: ['admin-clients'],
    queryFn: async () => (await api.get('/clients')).data,
  })

  if (clientsQuery.isLoading) return <LoadingBlock label="Cargando clientes…" />

  const clients = clientsQuery.data || []
  const term = search.trim().toLowerCase()
  const filtered = term
    ? clients.filter((client) => {
        const values = [
          client.name,
          client.email,
          client.phone,
          client.profile?.cedula,
          client.profile?.community,
        ]
        return values.some((value) => value?.toLowerCase().includes(term))
      })
    : clients

  const withLoans = clients.filter((client) => (client._count?.clientLoans || 0) > 0).length
  const withApplications = clients.filter((client) => (client._count?.applications || 0) > 0).length

  return (
    <div>
      <PageHeader
        eyebrow="Cartera"
        title="Clientes"
        description="Consultá los datos de contacto, la comunidad y el historial de cada cliente."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Clientes registrados" value={String(clients.length)} icon={UsersRound} />
        <StatCard
          label="Con préstamos"
          value={String(withLoans)}
          hint="Historial de crédito"
          icon={UsersRound}
          tone="blue"
        />
        <StatCard
          label="Con solicitudes"
          value={String(withApplications)}
          hint="Al menos una solicitud"
          icon={UsersRound}
          tone="gold"
        />
      </div>

      <Card className="mb-5 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <Input
            className="pl-11"
            placeholder="Buscar por nombre, correo, cédula o comunidad…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No encontramos clientes"
          description="Probá con otro término de búsqueda."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <PaginatedTable label="Clientes" className="table-base min-w-[920px]">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Comunidad</th>
                  <th>Ingreso mensual</th>
                  <th>Solicitudes</th>
                  <th>Préstamos</th>
                  <th>Cobrador</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest-50 text-xs font-bold text-forest-700">
                          {client.name
                            .split(' ')
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join('')
                            .toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold text-forest-950">{client.name}</p>
                          <p className="text-xs text-ink/45">{client.profile?.cedula}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="text-sm text-ink/70">{client.email}</p>
                      <p className="text-xs text-ink/45">{client.phone || 'Sin teléfono'}</p>
                    </td>
                    <td>{client.profile?.community || '—'}</td>
                    <td>{formatCurrency(client.profile?.monthlyIncome)}</td>
                    <td>{client._count?.applications || 0}</td>
                    <td>{client._count?.clientLoans || 0}</td>
                    <td>{client.profile?.assignedCollector?.name || 'Sin asignar'}</td>
                    <td className="text-right">
                      <Link
                        to={`/admin/clientes/${client.id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:text-forest-900"
                      >
                        Ver ficha <ArrowRight className="h-4 w-4" />
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
