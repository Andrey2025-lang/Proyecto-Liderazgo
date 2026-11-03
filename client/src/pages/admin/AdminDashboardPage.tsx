import { Link } from 'react-router-dom'
import { PaginatedList } from '@/components/ui/Pagination'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ClipboardList,
  TrendingUp,
  UsersRound,
  Wallet,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatCurrency, formatDate, statusLabels } from '@/lib/format'
import type { DashboardData } from '@/lib/types'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingBlock } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

const pieColors = ['#31664c', '#c9a227', '#4b8fb8', '#8b6bb8', '#b85b5b', '#7b8f84']

export function AdminDashboardPage() {
  const { user } = useAuth()
  const dashboardQuery = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/reports/dashboard')).data,
  })

  if (dashboardQuery.isLoading) return <LoadingBlock label="Preparando el tablero…" />
  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <EmptyState
        title="No pudimos cargar el tablero"
        description="Revisá la conexión con la API e intentá de nuevo."
      />
    )
  }

  const data = dashboardQuery.data
  const isCollector = user?.role === 'COLLECTOR'
  const pieData = data.applicationsByStatus.map((item) => ({
    name: statusLabels[item.status] || item.status,
    value: item.count,
  }))

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{isCollector ? 'Mi ruta' : 'Panel administrativo'}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-forest-950 sm:text-4xl">
            {isCollector ? 'Tu resumen de cobro' : 'Buenos días, equipo.'}
          </h1>
          <p className="mt-2 text-sm text-ink/55">
            {isCollector
              ? 'Una vista de tus clientes, préstamos y cobros asignados.'
              : 'Una vista general de la cartera, las solicitudes y los cobros de J&C.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isCollector && (
            <Link to="/admin/solicitudes">
              <Button variant="outline">
                <ClipboardList className="h-4 w-4" /> Revisar solicitudes
              </Button>
            </Link>
          )}
          <Link to="/admin/prestamos">
            <Button>
              <Wallet className="h-4 w-4" /> Ver cartera
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={isCollector ? 'Mis clientes' : 'Clientes'}
          value={String(data.kpis.clients)}
          hint="Personas registradas"
          icon={UsersRound}
        />
        <StatCard
          label="Solicitudes pendientes"
          value={String(data.kpis.pendingApplications)}
          hint="Requieren seguimiento"
          icon={ClipboardList}
          tone="gold"
        />
        <StatCard
          label="Préstamos activos"
          value={String(data.kpis.activeLoans)}
          hint={`${formatCurrency(data.kpis.portfolio)} en cartera`}
          icon={Wallet}
          tone="blue"
        />
        <StatCard
          label="Cobrado este mes"
          value={formatCurrency(data.kpis.collectedMonth)}
          hint={`${data.kpis.overdueCount} cuotas vencidas`}
          icon={TrendingUp}
          tone={data.kpis.overdueAmount > 0 ? 'red' : 'green'}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader
            title="Cobros de los últimos 6 meses"
            description="Pagos registrados por mes, sin incluir anulados."
          />
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyCollections} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={58}
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
          <CardHeader title="Solicitudes por estado" description="Distribución actual." />
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-ink/40">
                Sin solicitudes registradas.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={82}
                      paddingAngle={3}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [Number(value), 'Solicitudes']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader
            title={isCollector ? 'Mi cartera reciente' : 'Solicitudes recientes'}
            description={isCollector ? 'Préstamos asignados a tu ruta.' : 'Últimos movimientos del proceso.'}
            action={
              !isCollector ? (
                <Link to="/admin/solicitudes" className="text-sm font-semibold text-forest-700 hover:text-forest-900">
                  Ver todas
                </Link>
              ) : undefined
            }
          />
          <CardContent>
            {isCollector ? (
              data.recentLoans.length === 0 ? (
                <p className="text-sm text-ink/45">No tenés préstamos asignados todavía.</p>
              ) : (
                <div className="space-y-2">
                  {data.recentLoans.map((loan) => (
                    <Link
                      key={loan.id}
                      to={`/admin/prestamos/${loan.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-forest-900/10 p-3 transition hover:bg-forest-50/60"
                    >
                      <div>
                        <p className="text-sm font-semibold text-forest-950">
                          {loan.client?.name || 'Cliente'}
                        </p>
                        <p className="text-xs text-ink/45">
                          {formatCurrency(loan.principal)} · Saldo {formatCurrency(loan.balance)}
                        </p>
                      </div>
                      <StatusBadge status={loan.status} />
                    </Link>
                  ))}
                </div>
              )
            ) : data.recentApplications.length === 0 ? (
              <p className="text-sm text-ink/45">No hay solicitudes recientes.</p>
            ) : (
              <div className="space-y-2">
                {data.recentApplications.map((application) => (
                  <Link
                    key={application.id}
                    to={`/admin/solicitudes/${application.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-forest-900/10 p-3 transition hover:bg-forest-50/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-forest-950">
                        {application.client.name}
                      </p>
                      <p className="text-xs text-ink/45">
                        {formatCurrency(application.amountRequested)} ·{' '}
                        {formatDate(application.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={application.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Mora por antigüedad" description="Cuotas vencidas según días de atraso." />
          <CardContent>
            <div className="space-y-4">
              {data.aging.map((bucket) => {
                const max = Math.max(...data.aging.map((item) => item.amount), 1)
                return (
                  <div key={bucket.bucket}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-forest-950">{bucket.bucket}</span>
                      <span className="font-semibold text-forest-950">{formatCurrency(bucket.amount)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-forest-900/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-600"
                        style={{ width: `${Math.max((bucket.amount / max) * 100, bucket.amount ? 8 : 0)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-ink/40">{bucket.count} cuotas</p>
                  </div>
                )
              })}
            </div>
            <div className="mt-5 flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-xs text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Mora total: <span className="font-semibold">{formatCurrency(data.kpis.overdueAmount)}</span>.
                Priorizá el contacto con los casos de mayor antigüedad.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {data.communities.length > 0 && (
        <Card className="mt-6">
          <CardHeader
            title="Clientes por comunidad"
            description="Dónde está nuestra base de clientes."
            action={
              !isCollector ? (
                <Link to={user?.role === 'CLERK' ? '/admin/clientes' : '/admin/reportes'} className="text-sm font-semibold text-forest-700 hover:text-forest-900">
                  Ver reportes <ArrowRight className="h-4 w-4" />
                </Link>
              ) : undefined
            }
          />
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.communities.slice(0, 6).map((community) => (
                <div key={community.community} className="rounded-2xl bg-forest-50/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-forest-950">{community.community}</p>
                    <span className="text-sm font-semibold text-forest-700">{community.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isCollector && data.collectors.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Equipo de cobro" description="Clientes, cartera y cobros por cobrador." />
          <CardContent>
            <PaginatedList label="Equipo de cobro" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.collectors.map((collector) => (
                <div key={collector.id} className="rounded-2xl border border-forest-900/10 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-forest-950">{collector.name}</p>
                    <span className="text-xs font-semibold text-emerald-700">
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

      {data.kpis.overdueAmount > 0 && (
        <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Banknote className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Hay <span className="font-semibold">{formatCurrency(data.kpis.overdueAmount)}</span> en
              cuotas vencidas. Revisá la cartera para priorizar el seguimiento.
            </p>
          </div>
          <Link to={user?.role === 'CLERK' ? '/admin/prestamos' : '/admin/reportes'}>
            <Button variant="outline" size="sm">
              Ver morosidad <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
