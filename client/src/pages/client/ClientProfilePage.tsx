import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { BadgeCheck, Mail, MapPin, Phone, Save, ShieldCheck, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatDate, roleLabels } from '@/lib/format'
import { CommunityField } from '@/components/ui/CommunityField'
import type { Application, ClientProfile, Loan, User } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { LoadingBlock } from '@/components/ui/Spinner'
import { PageHeader } from '@/components/ui/PageHeader'

type ClientMe = User & {
  profile: ClientProfile
  applications?: Application[]
  clientLoans?: Loan[]
}

interface ProfileForm {
  name: string
  phone: string
  birthDate: string
  address: string
  community: string
  occupation: string
  employer: string
  employmentStartDate: string
  monthlyIncome: number
  otherIncome: number
}

export function ClientProfilePage() {
  const { refresh } = useAuth()
  const queryClient = useQueryClient()

  const clientQuery = useQuery<ClientMe>({
    queryKey: ['client-me'],
    queryFn: async () => (await api.get('/clients/me')).data,
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<ProfileForm>({
    defaultValues: {
      name: '',
      phone: '',
      birthDate: '',
      address: '',
      community: '',
      occupation: '',
      employer: '',
      employmentStartDate: '',
      monthlyIncome: 0,
      otherIncome: 0,
    },
  })

  useEffect(() => {
    if (!clientQuery.data) return
    reset({
      name: clientQuery.data.name || '',
      phone: clientQuery.data.phone || '',
      birthDate: clientQuery.data.profile?.birthDate?.slice(0, 10) || '',
      address: clientQuery.data.profile?.address || '',
      community: clientQuery.data.profile?.community || '',
      occupation: clientQuery.data.profile?.occupation || '',
      employer: clientQuery.data.profile?.employer || '',
      employmentStartDate: clientQuery.data.profile?.employmentStartDate?.slice(0, 10) || '',
      monthlyIncome: clientQuery.data.profile?.monthlyIncome || 0,
      otherIncome: clientQuery.data.profile?.otherIncome || 0,
    })
  }, [clientQuery.data, reset])

  const mutation = useMutation({
    mutationFn: async (values: ProfileForm) =>
      (
        await api.patch('/clients/me', {
          name: values.name,
          phone: values.phone,
          birthDate: values.birthDate || undefined,
          address: values.address || undefined,
          community: values.community || undefined,
          occupation: values.occupation || undefined,
          employer: values.employer || undefined,
          employmentStartDate: values.employmentStartDate || undefined,
          monthlyIncome: values.monthlyIncome || 0,
          otherIncome: values.otherIncome || 0,
        })
      ).data,
    onSuccess: async () => {
      toast.success('Perfil actualizado.')
      queryClient.invalidateQueries({ queryKey: ['client-me'] })
      await refresh()
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  if (clientQuery.isLoading) return <LoadingBlock label="Cargando tu perfil…" />
  const client = clientQuery.data
  if (!client) return null

  return (
    <div>
      <PageHeader
        eyebrow="Mi perfil"
        title="Tus datos personales"
        description="Mantené tu información actualizada para que el equipo pueda contactarte y evaluar tu solicitud."
      />

      <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="space-y-6">
          <Card>
            <CardContent className="text-center">
              <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-forest-900 text-2xl font-bold text-cream">
                {client.name
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')
                  .toUpperCase()}
              </span>
              <h2 className="mt-4 font-display text-2xl font-semibold text-forest-950">
                {client.name}
              </h2>
              <p className="mt-1 text-sm text-ink/45">{roleLabels[client.role]}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5 text-xs font-semibold text-forest-700">
                <BadgeCheck className="h-3.5 w-3.5" /> Cuenta activa
              </div>
              <div className="mt-5 space-y-2 text-left text-sm">
                <p className="flex items-center gap-2 text-ink/60">
                  <Mail className="h-4 w-4 text-forest-500" /> {client.email}
                </p>
                <p className="flex items-center gap-2 text-ink/60">
                  <Phone className="h-4 w-4 text-forest-500" /> {client.phone || 'Sin teléfono'}
                </p>
                <p className="flex items-center gap-2 text-ink/60">
                  <MapPin className="h-4 w-4 text-forest-500" />{' '}
                  {client.profile?.community || 'Sin comunidad'}
                </p>
              </div>
              <div className="mt-5 rounded-2xl bg-forest-50 p-3 text-left text-xs text-forest-800">
                <p className="font-semibold">Cédula</p>
                <p className="mt-0.5 font-mono">{client.profile?.cedula || '—'}</p>
                <p className="mt-2 font-semibold">Cliente desde</p>
                <p className="mt-0.5">{formatDate(client.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-3xl bg-forest-950 p-5 text-cream">
            <ShieldCheck className="h-6 w-6 text-gold" />
            <p className="mt-3 font-display text-xl font-semibold">Tus datos, bajo control</p>
            <p className="mt-1 text-sm leading-relaxed text-cream/60">
              Usamos tu información para gestionar tu solicitud y tu crédito. Si querés conocer
              cómo la tratamos, revisá nuestra política de privacidad.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader
            title="Información personal"
            description="Actualizá tus datos de contacto y situación económica."
          />
          <CardContent>
            <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input id="name" {...register('name')} />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" placeholder="8888-8888" {...register('phone')} />
                </div>
                <div>
                  <Label htmlFor="birthDate">Fecha de nacimiento</Label>
                  <Input id="birthDate" type="date" {...register('birthDate')} />
                </div>
                <Controller name="community" control={control} render={({ field }) => <CommunityField value={field.value} onChange={field.onChange} />} />
                <div>
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" placeholder="Dirección o punto de referencia" {...register('address')} />
                </div>
              </div>

              <div className="border-t border-forest-900/10 pt-5">
                <div className="mb-4 flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-forest-600" />
                  <p className="text-sm font-semibold text-forest-950">Situación económica</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="occupation">Ocupación</Label>
                    <Input id="occupation" maxLength={120} placeholder="Escribí tu ocupación" {...register('occupation')} />
                  </div>
                  <div>
                    <Label htmlFor="employer">Empleador o actividad</Label>
                    <Input id="employer" placeholder="Emprendimiento propio" {...register('employer')} />
                  </div>
                  <div>
                    <Label htmlFor="employmentStartDate">Inicio de la actividad</Label>
                    <Input id="employmentStartDate" type="date" {...register('employmentStartDate')} />
                  </div>
                  <div>
                    <Label htmlFor="monthlyIncome">Ingreso mensual (₡)</Label>
                    <Input
                      id="monthlyIncome"
                      type="number"
                      min={0}
                      step={1000}
                      {...register('monthlyIncome', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="otherIncome">Otros ingresos (₡)</Label>
                    <Input
                      id="otherIncome"
                      type="number"
                      min={0}
                      step={1000}
                      {...register('otherIncome', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-forest-900/10 pt-5">
                <p className="text-xs text-ink/40">
                  El correo y la cédula no se pueden editar desde el portal.
                </p>
                <Button type="submit" disabled={!isDirty || isSubmitting} loading={isSubmitting}>
                  <Save className="h-4 w-4" /> Guardar cambios
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
