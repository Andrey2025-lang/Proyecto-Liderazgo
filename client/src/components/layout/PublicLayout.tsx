import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Menu, ShieldCheck, X } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Settings } from '@/lib/types'
import { cn } from '@/lib/cn'

const navItems = [
  { to: '/', label: 'Inicio' },
  { to: '/como-funciona', label: 'Cómo funciona' },
  { to: '/requisitos', label: 'Requisitos' },
  { to: '/preguntas', label: 'Preguntas' },
]

export function PublicLayout() {
  const [open, setOpen] = useState(false)
  const { user, homeForRole } = useAuth()
  const settingsQuery = useQuery<Settings>({
    queryKey: ['public-settings'],
    queryFn: async () => (await api.get('/public/settings')).data,
  })
  const settings = settingsQuery.data
  const phones = [settings?.contactPhone, settings?.contactPhone2, settings?.contactPhone3].filter(
    Boolean,
  )

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-forest-950 px-4 py-2 text-center text-[10px] font-medium tracking-wide text-cream/70 sm:text-[11px]">
        Solicitudes en línea · Atención personalizada · Península de Nicoya
      </div>
      <header className="sticky top-0 z-40 border-b border-forest-900/10 bg-cream/90 backdrop-blur-xl">
        <div className="container-page flex h-20 items-center justify-between py-3">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-forest-900/10 text-forest-900'
                      : 'text-ink/60 hover:bg-forest-50 hover:text-forest-900',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <Link to={homeForRole(user.role)}>
                <Button size="sm">
                  Ir a mi portal <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Ingresar
                  </Button>
                </Link>
                <Link to="/registro">
                  <Button size="sm">
                    Crear cuenta <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-full p-2 text-forest-900 lg:hidden"
            aria-label="Abrir menú"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open && (
          <div className="border-t border-forest-900/10 bg-cream px-4 py-4 lg:hidden">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-2xl px-4 py-3 text-sm font-medium',
                      isActive
                        ? 'bg-forest-900/10 text-forest-900'
                        : 'text-ink/70 hover:bg-forest-50',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2 border-t border-forest-900/10 pt-4">
              {user ? (
                <Link to={homeForRole(user.role)} onClick={() => setOpen(false)}>
                  <Button className="w-full">Ir a mi portal</Button>
                </Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Ingresar
                    </Button>
                  </Link>
                  <Link to="/registro" onClick={() => setOpen(false)}>
                    <Button className="w-full">Crear cuenta</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="bg-forest-950 text-cream">
        <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo inverted />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/60">
              Crédito personal cercano, claro y con acompañamiento para las comunidades de la
              Península de Nicoya.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-cream/10 px-3 py-1.5 text-xs text-cream/70">
              <ShieldCheck className="h-4 w-4 text-gold" />
              Trato humano y decisiones transparentes
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Navegación</p>
            <div className="mt-4 flex flex-col gap-2 text-sm text-cream/65">
              {navItems.map((item) => (
                <Link key={item.to} to={item.to} className="transition hover:text-cream">
                  {item.label}
                </Link>
              ))}
              <Link to="/privacidad" className="transition hover:text-cream">
                Privacidad y datos
              </Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Contacto</p>
            <div className="mt-4 space-y-2 text-sm text-cream/65">
              <p>{settings?.address || 'Nandayure, Guanacaste, Costa Rica'}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {phones.map((phone) => (
                  <a
                    key={phone}
                    href={`tel:${String(phone).replace(/\D/g, '')}`}
                    className="transition hover:text-cream"
                  >
                    {phone}
                  </a>
                ))}
              </div>
              <p>{settings?.contactEmail || 'info@jycprestamos.cr'}</p>
              <p>{settings?.hours || 'Lunes a viernes, 8:00 a.m. a 5:00 p.m.'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Nuestro compromiso</p>
            <p className="mt-4 text-sm leading-relaxed text-cream/60">
              Ofrecemos condiciones claras, acompañamiento durante todo el proceso y canales de
              contacto directos para resolver tus dudas.
            </p>
          </div>
        </div>
        <div className="border-t border-cream/10">
          <div className="container-page flex flex-col gap-2 py-5 text-xs text-cream/45 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Préstamos J&C.</p>
            <p>Hecho con acompañamiento para la Península de Nicoya.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
