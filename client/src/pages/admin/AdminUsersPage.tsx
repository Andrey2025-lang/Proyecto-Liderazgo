import { useState } from 'react'
import { PaginatedTable } from '@/components/ui/Pagination'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, ShieldCheck, UserCheck, UserRound, UserX, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatDate, roleLabels } from '@/lib/format'
import type { User } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingBlock } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'

interface CreateForm {
  name: string
  email: string
  phone: string
  password: string
  role: string
}

const emptyForm: CreateForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'SUPERVISOR',
}

export function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<CreateForm>(emptyForm)

  const usersQuery = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  })

  const createMutation = useMutation({
    mutationFn: async () => (await api.post('/users', form)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setCreateOpen(false)
      setForm(emptyForm)
      toast.success('Usuario creado.')
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.patch(`/users/${id}/status`, { status })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Estado actualizado.')
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  if (usersQuery.isLoading) return <LoadingBlock label="Cargando usuarios…" />
  const users = usersQuery.data || []
  const term = search.trim().toLowerCase()
  const filtered = users.filter((user) => {
    const matchesTerm = term
      ? [user.name, user.email, user.phone].some((value) =>
          value?.toLowerCase().includes(term),
        )
      : true
    const matchesRole = roleFilter ? user.role === roleFilter : true
    return matchesTerm && matchesRole
  })
  const active = users.filter((user) => user.status === 'ACTIVE').length
  const staff = users.filter((user) => user.role !== 'CLIENT').length

  return (
    <div>
      <PageHeader
        eyebrow="Accesos"
        title="Usuarios"
        description="Administrá los accesos del equipo y consultá las cuentas registradas."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nuevo usuario interno
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Usuarios totales" value={String(users.length)} icon={UsersRound} />
        <StatCard label="Cuentas activas" value={String(active)} icon={UserCheck} tone="blue" />
        <StatCard label="Equipo interno" value={String(staff)} icon={ShieldCheck} tone="gold" />
      </div>

      <Card className="mb-5">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <Input
              className="pl-11"
              placeholder="Buscar por nombre, correo o teléfono…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="sm:w-52">
            <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="">Todos los roles</option>
              <option value="ADMIN">Administrador</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="CLERK">Oficinista</option>
              <option value="COLLECTOR">Cobrador</option>
              <option value="CLIENT">Cliente</option>
            </Select>
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No encontramos usuarios"
          description="Probá con otro término de búsqueda o rol."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <PaginatedTable label="Usuarios" className="table-base min-w-[820px]">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Contacto</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-forest-50 text-forest-700">
                          <UserRound className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold text-forest-950">{user.name}</p>
                          <p className="text-xs text-ink/45">
                            {user.profile?.cedula || 'Cuenta interna'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="text-sm text-ink/70">{user.email}</p>
                      <p className="text-xs text-ink/45">{user.phone || 'Sin teléfono'}</p>
                    </td>
                    <td>
                      <Badge tone={user.role === 'ADMIN' ? 'gold' : user.role === 'CLIENT' ? 'neutral' : 'blue'}>
                        {roleLabels[user.role]}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={user.status === 'ACTIVE' ? 'green' : 'red'}>
                        {user.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td className="text-right">
                      {user.role !== 'CLIENT' && user.id !== currentUser?.id && (
                        <Button
                          size="sm"
                          variant={user.status === 'ACTIVE' ? 'outline' : 'secondary'}
                          onClick={() =>
                            statusMutation.mutate({
                              id: user.id,
                              status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                            })
                          }
                          loading={statusMutation.isPending}
                        >
                          {user.status === 'ACTIVE' ? (
                            <>
                              <UserX className="h-3.5 w-3.5" /> Desactivar
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5" /> Activar
                            </>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </PaginatedTable>
          </div>
        </Card>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nuevo usuario interno"
        description="Podés crear administradores, supervisores, oficinistas y cobradores."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={
                form.name.trim().length < 2 ||
                !form.email.includes('@') ||
                form.password.length < 8
              }
            >
              Crear usuario
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="new-name">Nombre completo</Label>
            <Input
              id="new-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="María Rodríguez"
            />
          </div>
          <div>
            <Label htmlFor="new-email">Correo</Label>
            <Input
              id="new-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="usuario@jyc.cr"
            />
          </div>
          <div>
            <Label htmlFor="new-phone">Teléfono</Label>
            <Input
              id="new-phone"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="8888-8888"
            />
          </div>
          <div>
            <Label htmlFor="new-role">Rol</Label>
            <Select
              id="new-role"
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
            >
              <option value="SUPERVISOR">Supervisor</option>
              <option value="CLERK">Oficinista</option>
              <option value="COLLECTOR">Cobrador</option>
              <option value="ADMIN">Administrador</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="new-password">Contraseña temporal</Label>
            <Input
              id="new-password"
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
