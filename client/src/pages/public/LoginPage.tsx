import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { FullScreenLoader } from '@/components/layout/ProtectedRoute'
import { useAuth } from '@/lib/auth'
import { apiErrorMessage } from '@/lib/api'

const schema = z.object({
  email: z.string().min(1, 'Ingresá tu correo.').email('Ingresá un correo válido.'),
  password: z.string().min(1, 'Ingresá tu contraseña.'),
})

type FormValues = z.infer<typeof schema>

const accessAccounts = [
  { role: 'Cliente', email: 'cliente@jyc.cr', password: 'Cliente123!' },
  { role: 'Administrador', email: 'admin@jyc.cr', password: 'Staff123!' },
  { role: 'Supervisor', email: 'supervisor@jyc.cr', password: 'Staff123!' },
  { role: 'Oficinista', email: 'oficinista@jyc.cr', password: 'Staff123!' },
  { role: 'Cobrador', email: 'cobrador@jyc.cr', password: 'Staff123!' },
]

export function LoginPage() {
  const { user, loading, login, homeForRole } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  if (loading) return <FullScreenLoader />
  if (user) return <Navigate to={homeForRole(user.role)} replace />

  const onSubmit = async (values: FormValues) => {
    try {
      const logged = await login(values)
      toast.success(`Bienvenido, ${logged.name.split(' ')[0]}.`)
      navigate(homeForRole(logged.role), { replace: true })
    } catch (error) {
      toast.error(apiErrorMessage(error))
    }
  }

  return (
    <div className="grid min-h-screen bg-cream lg:grid-cols-[1.02fr_0.98fr]">
      <aside className="relative hidden overflow-hidden bg-forest-950 p-10 text-cream lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-forest-500/20 blur-3xl" />
        <Logo inverted />
        <div className="relative max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Portal J&C</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight">
            Tu crédito, tus pagos y tu tranquilidad en un solo lugar.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-cream/60">
            Revisá el estado de tu solicitud, consultá tu plan de pagos y mantené tu información al
            día desde tu portal.
          </p>
          <div className="mt-8 space-y-3">
            {[
              'Seguimiento claro de cada etapa',
              'Plan de pagos y saldo actualizado',
              'Comunicación directa con el equipo',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-cream/70">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-gold/15 text-gold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-cream/35">
          Préstamos J&C · Octubre 2026
        </p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo />
            <Link to="/" className="text-sm font-semibold text-forest-700">
              Volver
            </Link>
          </div>

          <div>
            <p className="eyebrow">Bienvenido de nuevo</p>
            <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight text-forest-950">
              Ingresá a tu cuenta
            </h2>
            <p className="mt-2 text-sm text-ink/55">
              Usá el correo con el que te registraste. Si es tu primera vez, podés crear una cuenta.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <span className="text-xs text-ink/40">Mínimo 8 caracteres</span>
              </div>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
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

            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
              Ingresar <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-ink/55">
            ¿No tenés cuenta?{' '}
            <Link to="/registro" className="font-semibold text-forest-700 hover:text-forest-900">
              Crear una cuenta
            </Link>
          </p>

          <div className="mt-8 rounded-3xl border border-forest-900/10 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest-600">
              Accesos rápidos
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {accessAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setValue('email', account.email)
                    setValue('password', account.password)
                  }}
                  className="rounded-2xl border border-forest-900/10 bg-cream/60 px-3 py-2 text-left transition hover:border-forest-300 hover:bg-forest-50"
                >
                  <span className="block text-xs font-semibold text-forest-950">{account.role}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-ink/45">{account.email}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-ink/40">Tocá una cuenta para completar el formulario.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
