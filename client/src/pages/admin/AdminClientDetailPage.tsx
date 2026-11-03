import { useEffect, useState } from 'react'
import { PaginatedList } from '@/components/ui/Pagination'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Save,
  UserRound,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  formatCurrency,
  formatDate,
  formatInstallmentCount,
} from '@/lib/format'
import { formatTermForFrequency } from '@/lib/loan-options'
import type { Application, ClientProfile, Loan, User } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingBlock } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'

type ClientDetail = User & {
  profile: ClientProfile
  applications: Application[]
  clientLoans: Loan[]
}

export function AdminClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [collectorId, setCollectorId] = useState('')

  const clientQuery = useQuery<ClientDetail>({
    queryKey: ['admin-client', id],
    queryFn: async () => (await api.get(`/clients/${id}`)).data,
    enabled: Boolean(id),
  })
  const collectorsQuery = useQuery<User[]>({
    queryKey: ['collectors'],
    queryFn: async () => (await api.get('/users/collectors')).data,
    enabled: user?.role === 'ADMIN' || user?.role === 'SUPERVISOR',
  })

  useEffect(() => {
    if (clientQuery.data) {
      setCollectorId(clientQuery.data.profile?.assignedCollectorId || '')
    }
  }, [clientQuery.data])

  const assignMutation = useMutation({
    mutationFn: async () =>
      (
        await api.patch(`/clients/${id}/assign`, {
          collectorId: collectorId || null,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-client', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] })
      toast.success('Cobrador actualizado.')
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  if (clientQuery.isLoading) return <LoadingBlock label="Cargando la ficha del cliente…" />
  if (clientQuery.isError || !clientQuery.data) {
    return (
      <EmptyState
        title="No encontramos ese cliente"
        description="El enlace puede ser incorrecto o el cliente ya no está disponible."
        action={
          <Link to="/admin/clientes">
            <Button>Volver a clientes</Button>
          </Link>
        }
      />
    )
  }

  const client = clientQuery.data
  const loans = client.clientLoans || []
  const applications = client.applications || []
  const activeLoans = loans.filter((loan) => ['ACTIVE', 'DEFAULTED'].includes(loan.status))
  const balance = activeLoans.reduce((sum, loan) => sum + (loan.balance || 0), 0)
  const paid = loans.reduce((sum, loan) => sum + (loan.paidAmount || 0), 0)
  const canAssign = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR'

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/clientes"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700 hover:text-forest-900"
        >
          <ArrowLeft className="h-4 w-4" /> Clientes
        </Link>
        <StatusBadge status={client.status} />
      </div>

      <div className="rounded-4xl border border-forest-900/10 bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-3xl bg-forest-900 text-2xl font-bold text-cream">
              {client.name
                .split(' ')
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase()}
            </span>
            <div>
              <p className="eyebrow">Ficha del cliente</p>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-forest-950 sm:text-4xl">
                {client.name}
              </h1>
              <p className="mt-1 text-sm text-ink/50">
                {client.profile?.cedula} · Cliente desde {formatDate(client.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`mailto:${client.email}`}>
              <Button variant="outline">
                <Mail className="h-4 w-4" /> Correo
              </Button>
            </a>
            {client.phone && (
              <a href={`tel:${client.phone}`}>
                <Button variant="outline">
                  <Phone className="h-4 w-4" /> Llamar
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Solicitudes" value={String(applications.length)} icon={UsersRound} />
        <StatCard
          label="Préstamos activos"
          value={String(activeLoans.length)}
          hint={`${loans.length} en total`}
          icon={Wallet}
          tone="blue"
        />
        <StatCard label="Saldo pendiente" value={formatCurrency(balance)} icon={Wallet} tone="gold" />
        <StatCard label="Total pagado" value={formatCurrency(paid)} icon={CheckCircle2} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Datos de contacto" />
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-start gap-2 text-ink/65">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" /> {client.email}
              </p>
              <p className="flex items-start gap-2 text-ink/65">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />{' '}
                {client.phone || 'Sin teléfono'}
              </p>
              <p className="flex items-start gap-2 text-ink/65">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />{' '}
                {client.profile?.address || 'Sin dirección'}
                {client.profile?.community ? `, ${client.profile.community}` : ''}
              </p>
              <p className="flex items-start gap-2 text-ink/65">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" /> Nacimiento:{' '}
                {formatDate(client.profile?.birthDate)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Situación económica" />
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-start gap-2 text-ink/65">
                <BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />{' '}
                {client.profile?.occupation || 'Sin ocupación'}
                {client.profile?.employer ? ` · ${client.profile.employer}` : ''}
              </p>
              <div className="flex justify-between gap-3 border-t border-forest-900/10 pt-3">
                <span className="text-ink/45">Ingreso mensual</span>
                <span className="font-semibold text-forest-950">
                  {formatCurrency(client.profile?.monthlyIncome)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink/45">Otros ingresos</span>
                <span className="font-semibold text-forest-950">
                  {formatCurrency(client.profile?.otherIncome)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink/45">Inicio de actividad</span>
                <span className="font-semibold text-forest-950">
                  {formatDate(client.profile?.employmentStartDate)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Cobrador asignado" description="Ruta de seguimiento del cliente." />
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-forest-50 p-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-forest-900 text-cream">
                  <UserRound className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-forest-950">
                    {client.profile?.assignedCollector?.name || 'Sin asignar'}
                  </p>
                  <p className="text-xs text-ink/45">
                    {client.profile?.assignedCollector?.phone || 'Sin teléfono'}
                  </p>
                </div>
              </div>
              {canAssign && (
                <div className="space-y-2">
                  <Label htmlFor="collector">Cambiar cobrador</Label>
                  <Select
                    id="collector"
                    value={collectorId}
                    onChange={(event) => setCollectorId(event.target.value)}
                  >
                    <option value="">Sin asignar</option>
                    {(collectorsQuery.data || []).map((collector) => (
                      <option key={collector.id} value={collector.id}>
                        {collector.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => assignMutation.mutate()}
                    loading={assignMutation.isPending}
                  >
                    <Save className="h-4 w-4" /> Guardar asignación
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Solicitudes"
              description="Historial de solicitudes del cliente."
              action={
                <span className="rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-700">
                  {applications.length}
                </span>
              }
            />
            <CardContent>
              {applications.length === 0 ? (
                <p className="text-sm text-ink/45">El cliente no tiene solicitudes.</p>
              ) : (
                <PaginatedList label="Solicitudes del cliente" className="space-y-2">
                  {applications.map((application) => (
                    <Link
                      key={application.id}
                      to={`/admin/solicitudes/${application.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-forest-900/10 p-3 transition hover:bg-forest-50/60"
                    >
                      <div>
                        <p className="text-sm font-semibold text-forest-950">
                          {formatCurrency(application.amountRequested)}
                        </p>
                        <p className="text-xs text-ink/45">
                          {formatDate(application.createdAt)} ·{' '}
                          {formatTermForFrequency(application.termWeeks, application.paymentFrequency)} ·{' '}
                          {formatInstallmentCount(application.termInstallments)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={application.status} />
                        <ArrowRight className="h-4 w-4 text-forest-500" />
                      </div>
                    </Link>
                  ))}
                </PaginatedList>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Préstamos"
              description="Créditos y planes de pago."
              action={
                <span className="rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-700">
                  {loans.length}
                </span>
              }
            />
            <CardContent>
              {loans.length === 0 ? (
                <p className="text-sm text-ink/45">El cliente no tiene préstamos.</p>
              ) : (
                <PaginatedList label="Préstamos del cliente" className="space-y-2">
                  {loans.map((loan) => (
                    <Link
                      key={loan.id}
                      to={`/admin/prestamos/${loan.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-forest-900/10 p-3 transition hover:bg-forest-50/60"
                    >
                      <div>
                        <p className="text-sm font-semibold text-forest-950">
                          {formatCurrency(loan.principal)}
                        </p>
                        <p className="text-xs text-ink/45">
                          Saldo {formatCurrency(loan.balance)} · {formatTermForFrequency(loan.termWeeks, loan.paymentFrequency)} ·{' '}
                          {formatInstallmentCount(loan.termInstallments)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={loan.status} />
                        <ArrowRight className="h-4 w-4 text-forest-500" />
                      </div>
                    </Link>
                  ))}
                </PaginatedList>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
