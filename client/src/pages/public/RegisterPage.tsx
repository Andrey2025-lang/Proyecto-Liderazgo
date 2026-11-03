import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  IdCard,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { FullScreenLoader } from '@/components/layout/ProtectedRoute'
import { useAuth } from '@/lib/auth'
import { apiErrorMessage } from '@/lib/api'
import { CommunityField } from '@/components/ui/CommunityField'

const schema = z
  .object({
    name: z.string().min(3, 'Ingresá tu nombre completo.'),
    email: z.string().min(1, 'Ingresá tu correo.').email('Ingresá un correo válido.'),
    phone: z.string().optional(),
    community: z.string().trim().min(1, 'Elegí o escribí tu zona.').max(120).refine((value) => value !== 'Otra zona', 'Especificá la zona.'),
    occupation: z.string().trim().min(1, 'Escribí tu ocupación.').max(120),
    cedula: z
      .string()
      .min(1, 'Ingresá tu cédula.')
      .regex(/^\d-\d{4}-\d{4}$/, 'Usá el formato 1-2345-6789.'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmPassword: z.string().min(8, 'Confirmá tu contraseña.'),
    acceptPrivacy: z.boolean().refine((value) => value, {
      message: 'Debés aceptar la política de privacidad.',
    }),
    acceptEquifax: z.boolean(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const { user, loading, register: registerUser, homeForRole } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      cedula: '',
      community: '',
      occupation: '',
      password: '',
      confirmPassword: '',
      acceptPrivacy: false,
      acceptEquifax: true,
    },
  })

  if (loading) return <FullScreenLoader />
  if (user) return <Navigate to={homeForRole(user.role)} replace />

  const onSubmit = async (values: FormValues) => {
    try {
      const created = await registerUser({
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        cedula: values.cedula,
        community: values.community,
        occupation: values.occupation,
        password: values.password,
        acceptPrivacy: values.acceptPrivacy,
        acceptEquifax: values.acceptEquifax,
      })
      toast.success(`Cuenta creada. Bienvenido, ${created.name.split(' ')[0]}.`)
      navigate('/app/solicitudes/nueva', { replace: true })
    } catch (error) {
      toast.error(apiErrorMessage(error))
    }
  }

  return (
    <div className="grid min-h-screen bg-cream lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative hidden overflow-hidden bg-forest-950 p-10 text-cream lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-forest-500/20 blur-3xl" />
        <Logo inverted />
        <div className="relative max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">
            Un paso a la vez
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight">
            Empezá tu solicitud con claridad.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-cream/60">
            Creá tu cuenta para completar la solicitud en línea, adjuntar documentos y dar
            seguimiento al proceso desde tu portal.
          </p>
          <div className="mt-8 space-y-4">
            {[
              'Tus datos se tratan de forma confidencial',
              'Podés guardar un borrador y continuar después',
              'Vas a ver el estado de tu solicitud en todo momento',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 text-sm text-cream/70">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-cream/35">Préstamos J&C · Octubre 2026</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-lg">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo />
            <Link to="/" className="text-sm font-semibold text-forest-700">
              Volver
            </Link>
          </div>

          <div>
            <p className="eyebrow">Crear cuenta</p>
            <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight text-forest-950">
              Empezá tu solicitud
            </h2>
            <p className="mt-2 text-sm text-ink/55">
              Solo necesitás unos minutos. Después vas a poder completar el resto del formulario.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Nombre completo</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                  <Input
                    id="name"
                    placeholder="Ana Mora"
                    className="pl-11"
                    error={errors.name?.message}
                    {...register('name')}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@correo.com"
                    className="pl-11"
                    error={errors.email?.message}
                    {...register('email')}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                  <Input
                    id="phone"
                    placeholder="8888-8888"
                    className="pl-11"
                    error={errors.phone?.message}
                    {...register('phone')}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="cedula">Cédula de identidad</Label>
                <div className="relative">
                  <IdCard className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                  <Input
                    id="cedula"
                    placeholder="1-2345-6789"
                    className="pl-11"
                    error={errors.cedula?.message}
                    {...register('cedula')}
                  />
                </div>
              </div>
              <div>
                <Controller name="community" control={control} render={({ field }) => <CommunityField value={field.value} onChange={field.onChange} error={errors.community?.message} required />} />
              </div>
              <div>
                <Label htmlFor="occupation">Ocupación *</Label>
                <Input id="occupation" maxLength={120} placeholder="Escribí tu ocupación" error={errors.occupation?.message} {...register('occupation')} />
              </div>
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    className="pl-11 pr-12"
                    error={errors.password?.message}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink/40 hover:bg-forest-50 hover:text-forest-800"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Repetí tu contraseña"
                    className="pl-11"
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-forest-900/10 bg-white p-4">
              <label className="flex cursor-pointer items-start gap-3 text-sm text-ink/65">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-forest-900/20 text-forest-700 focus:ring-forest-600"
                  {...register('acceptPrivacy')}
                />
                <span>
                  Acepto la{' '}
                  <Link to="/privacidad" className="font-semibold text-forest-700 underline decoration-forest-300 underline-offset-2">
                    política de privacidad
                  </Link>{' '}
                  y el tratamiento de mis datos para evaluar la solicitud.
                </span>
              </label>
              {errors.acceptPrivacy && (
                <p className="text-xs font-medium text-red-600">{errors.acceptPrivacy.message}</p>
              )}
              <label className="flex cursor-pointer items-start gap-3 text-sm text-ink/65">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-forest-900/20 text-forest-700 focus:ring-forest-600"
                  {...register('acceptEquifax')}
                />
                <span>
                  Autorizo la consulta de referencias crediticias y comerciales para evaluar mi
                  solicitud.
                </span>
              </label>
            </div>

            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
              Crear mi cuenta <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-ink/55">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="font-semibold text-forest-700 hover:text-forest-900">
              Ingresar
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
