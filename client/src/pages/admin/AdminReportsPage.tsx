import { Link } from 'react-router-dom'
import { PaginatedTable, PaginatedList } from '@/components/ui/Pagination'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowRight, BarChart3, Download, HandCoins, TrendingUp, Wallet } from 'lucide-react'
import { API_URL, api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatCurrency, formatDate } from '@/lib/format'
import type { DashboardData, Loan } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { LoadingBlock } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'

interface CollectorPerformance {
  id: string
  name: string
  phone?: string | null
  status: string
  clients: number
  activeLoans: number
  collected: number
}

interface CommunityRow {
  community: string
  count: number
}

interface AgingRow {
  bucket: string
  count: number
  amount: number
}

export function AdminReportsPage() {
  const { user } = useAuth()
  const dashboardQuery = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/reports/dashboard')).data,
  })
  const portfolioQuery = useQuery<Loan[]>({
    queryKey: ['report-portfolio'],
    queryFn: async () => (await api.get('/reports/portfolio')).data,
  })
  const agingQuery = useQuery<AgingRow[]>({
    queryKey: ['report-aging'],
    queryFn: async () => (await api.get('/reports/aging')).data,
  })
  const collectorsQuery = useQuery<CollectorPerformance[]>({
    queryKey: ['report-collectors'],
    queryFn: async () => (await api.get('/reports/collectors')).data,
    enabled: user?.role === 'ADMIN' || user?.role === 'SUPERVISOR',
  })
  const communitiesQuery = useQuery<CommunityRow[]>({
    queryKey: ['report-communities'],
    queryFn: async () => (await api.get('/reports/communities')).data,
    enabled: user?.role === 'ADMIN' || user?.role === 'SUPERVISOR',
  })

  if (dashboardQuery.isLoading) return <LoadingBlock label="Calculando reportes…" />
  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <EmptyState
        title="No pudimos cargar los reportes"
        description="Revisá la conexión con la API e intentá de nuevo."
      />
    )
  }

  const dashboard = dashboardQuery.data
  const portfolio = portfolioQuery.data || []
  const aging = agingQuery.data || []
  const collectors = collectorsQuery.data || []
  const communities = communitiesQuery.data || []
  const totalPortfolio = portfolio.reduce((sum, loan) => sum + (loan.balance || 0), 0)
  const averageTicket = portfolio.length ? totalPortfolio / portfolio.length : 0
  const canExport = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR'

  return (
    <div>
      <PageHeader
        eyebrow="Análisis"
        title="Reportes de cartera"
        description="Cartera, morosidad, cobros y desempeño del equipo en una sola vista."
        actions={
          canExport ? (
            <a href={`${API_URL}/reports/export`} target="_blank" rel="noreferrer">
              <Button variant="outline">
                <Download className="h-4 w-4" /> Descargar reportes Excel
              </Button>
            </a>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Saldo en cartera"
          value={formatCurrency(totalPortfolio)}
          hint={`${portfolio.length} préstamos activos`}
          icon={Wallet}
        />
        <StatCard
          label="Ticket promedio"
          value={formatCurrency(averageTicket)}
          hint="Saldo promedio por préstamo"
          icon={HandCoins}
          tone="blue"
        />
        <StatCard
          label="Cobrado este mes"
          value={formatCurrency(dashboard.kpis.collectedMonth)}
          hint="Pagos vigentes del mes"
          icon={TrendingUp}
          tone="gold"
        />
        <StatCard
          label="Monto vencido"
          value={formatCurrency(dashboard.kpis.overdueAmount)}
          hint={`${dashboard.kpis.overdueCount} cuotas`}
          icon={BarChart3}
          tone={dashboard.kpis.overdueAmount > 0 ? 'red' : 'green'}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader
            title="Evolución de cobros"
            description="Pagos registrados en los últimos 6 meses."
          />
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.monthlyCollections} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={60}
                    tickFormatter={(value) => `₡${Math.round(Number(value) / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), 'Cobrado']}
                    labelStyle={{ color: '#123b2e', fontWeight: 600 }}
                  />
                  <Bar dataKey="total" fill="#31664c" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Mora por antigüedad" description="Distribución del saldo vencido." />
          <CardContent>
            <div className="space-y-4">
              {aging.map((row) => {
                const max = Math.max(...aging.map((item) => item.amount), 1)
                return (
                  <div key={row.bucket}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-forest-950">{row.bucket}</span>
                      <span className="font-semibold text-forest-950">{formatCurrency(row.amount)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-forest-900/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-600"
                        style={{ width: `${Math.max((row.amount / max) * 100, row.amount ? 8 : 0)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-ink/40">{row.count} cuotas</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader title="Cartera activa" description="Detalle de los préstamos con saldo." />
          <div className="overflow-x-auto">
            <PaginatedTable label="Cartera activa" className="table-base min-w-[680px]">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Monto</th>
                  <th>Saldo</th>
                  <th>Vencido</th>
                  <th>Próximo pago</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {portfolio.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-ink/40">
                      No hay cartera activa.
                    </td>
                  </tr>
                )}
                {portfolio.map((loan) => (
                  <tr key={loan.id}>
                    <td>
                      <p className="font-medium text-forest-950">{loan.client?.name}</p>
                      <p className="text-xs text-ink/45">{loan.client?.profile?.community}</p>
                    </td>
                    <td>{formatCurrency(loan.principal)}</td>
                    <td className="font-semibold text-forest-950">{formatCurrency(loan.balance)}</td>
                    <td className={Number(loan.overdueAmount) > 0 ? 'font-semibold text-red-600' : ''}>
                      {formatCurrency(loan.overdueAmount)}
                    </td>
                    <td>{formatDate(loan.nextDueDate)}</td>
                    <td className="text-right">
                      <Link
                        to={`/admin/prestamos/${loan.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:text-forest-900"
                      >
                        Ver <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </PaginatedTable>
          </div>
        </Card>

        <div className="space-y-6">
          {communities.length > 0 && (
            <Card>
              <CardHeader title="Clientes por comunidad" />
              <CardContent className="space-y-2">
                <PaginatedList label="Clientes por comunidad" className="space-y-2">
                {communities.map((row) => (
                  <div
                    key={row.community}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-forest-50/70 px-4 py-2.5 text-sm"
                  >
                    <span className="text-forest-950">{row.community}</span>
                    <span className="font-semibold text-forest-700">{row.count}</span>
                  </div>
                ))}
                </PaginatedList>
              </CardContent>
            </Card>
          )}

          {collectors.length > 0 && (
            <Card>
              <CardHeader title="Desempeño de cobro" />
              <CardContent className="space-y-3">
                <PaginatedList label="Desempeño de cobro" className="space-y-3">
                {collectors.map((collector) => (
                  <div key={collector.id} className="rounded-2xl border border-forest-900/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-forest-950">{collector.name}</p>
                      <span className="text-sm font-semibold text-forest-700">
                        {formatCurrency(collector.collected)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink/45">
                      {collector.clients} clientes · {collector.activeLoans} préstamos activos
                    </p>
                  </div>
                ))}
                </PaginatedList>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
