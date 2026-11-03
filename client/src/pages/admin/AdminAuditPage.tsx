import { useState } from 'react'
import { PaginatedTable } from '@/components/ui/Pagination'
import { useQuery } from '@tanstack/react-query'
import { FileText, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDateTime, roleLabels } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingBlock } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'

interface AuditLog {
  id: string
  action: string
  entity: string
  entityId?: string | null
  metadata?: unknown
  createdAt: string
  user?: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

export function AdminAuditPage() {
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState('200')
  const auditQuery = useQuery<AuditLog[]>({
    queryKey: ['audit', limit],
    queryFn: async () => (await api.get('/audit', { params: { limit } })).data,
  })

  if (auditQuery.isLoading) return <LoadingBlock label="Cargando auditoría…" />
  const logs = auditQuery.data || []
  const term = search.trim().toLowerCase()
  const filtered = term
    ? logs.filter((log) => {
        const values = [log.action, log.entity, log.user?.name, log.user?.email]
        return values.some((value) => value?.toLowerCase().includes(term))
      })
    : logs

  const toneForAction = (action: string): 'green' | 'gold' | 'blue' | 'red' | 'neutral' => {
    if (action.includes('VOID') || action.includes('REJECT') || action.includes('INACTIVE')) return 'red'
    if (action.includes('APPROVE') || action.includes('PAYMENT') || action.includes('DISBURSE')) return 'green'
    if (action.includes('UPDATE') || action.includes('ASSIGN')) return 'blue'
    if (action.includes('CREATE')) return 'gold'
    return 'neutral'
  }

  return (
    <div>
      <PageHeader
        eyebrow="Trazabilidad"
        title="Auditoría"
        description="Registro de las acciones sensibles realizadas por el equipo interno."
      />

      <Card className="mb-5">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <Input
              className="pl-11"
              placeholder="Buscar por acción, entidad o usuario…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="sm:w-44">
            <Select value={limit} onChange={(event) => setLimit(event.target.value)}>
              <option value="50">Últimos 50</option>
              <option value="100">Últimos 100</option>
              <option value="200">Últimos 200</option>
              <option value="500">Últimos 500</option>
            </Select>
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No hay registros"
          description="No encontramos acciones con ese filtro."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <PaginatedTable label="Auditoría" className="table-base min-w-[880px]">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Acción</th>
                  <th>Entidad</th>
                  <th>Usuario</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap text-xs">{formatDateTime(log.createdAt)}</td>
                    <td>
                      <Badge tone={toneForAction(log.action)}>{log.action}</Badge>
                    </td>
                    <td>
                      <p className="text-sm font-medium text-forest-950">{log.entity}</p>
                      <p className="font-mono text-[11px] text-ink/40">
                        {log.entityId ? log.entityId.slice(-8) : '—'}
                      </p>
                    </td>
                    <td>
                      {log.user ? (
                        <>
                          <p className="text-sm text-forest-950">{log.user.name}</p>
                          <p className="text-xs text-ink/45">
                            {roleLabels[log.user.role] || log.user.role}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-ink/40">Sistema</span>
                      )}
                    </td>
                    <td>
                      {log.metadata ? (
                        <details className="max-w-xs">
                          <summary className="cursor-pointer text-xs font-medium text-forest-700">
                            Ver metadata
                          </summary>
                          <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-forest-950 p-2 text-[10px] leading-relaxed text-cream/80">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-xs text-ink/35">Sin detalle</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </PaginatedTable>
          </div>
        </Card>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-ink/40">
        <FileText className="h-4 w-4" /> Se muestran {filtered.length} de {logs.length} registros.
      </div>
    </div>
  )
}
