import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  Wallet,
  X,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'

const navItems = [
  { to: '/app', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/app/solicitudes', label: 'Mis solicitudes', icon: FileText },
  { to: '/app/prestamos', label: 'Mis préstamos', icon: Wallet },
  { to: '/app/perfil', label: 'Mi perfil', icon: UserRound },
]

export function PortalLayout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const initials = user?.name
    ?.split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen bg-cream">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-forest-900/10 bg-white lg:flex">
        <div className="px-6 py-6">
          <Logo to="/app" />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                  isActive
                    ? 'bg-forest-900 text-cream shadow-sm'
                    : 'text-ink/65 hover:bg-forest-50 hover:text-forest-900',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-forest-900/10 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-forest-50 p-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-forest-900 text-sm font-bold text-cream">
              {initials || 'C'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-forest-950">{user?.name}</p>
              <p className="truncate text-xs text-ink/50">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium text-ink/60 transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </div>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-forest-900/10 bg-cream/90 px-4 backdrop-blur-xl lg:hidden">
          <Logo to="/app" compact />
          <div className="flex items-center gap-2">
            <span className="max-w-32 truncate text-sm font-semibold text-forest-950">
              {user?.name}
            </span>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="rounded-full p-2 text-forest-900"
              aria-label="Abrir menú"
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </header>

        {open && (
          <div className="border-b border-forest-900/10 bg-white px-4 py-4 lg:hidden">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium',
                      isActive
                        ? 'bg-forest-900 text-cream'
                        : 'text-ink/65 hover:bg-forest-50',
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              ))}
              <button
                type="button"
                onClick={() => logout()}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </button>
            </nav>
          </div>
        )}

        <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
