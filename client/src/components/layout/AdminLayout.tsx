import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  ClipboardList,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/lib/auth'
import { roleLabels } from '@/lib/format'
import { cn } from '@/lib/cn'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'SUPERVISOR', 'COLLECTOR', 'CLERK'], end: true },
  { to: '/admin/recepcion', label: 'Recepción', icon: ClipboardList, roles: ['ADMIN', 'SUPERVISOR', 'CLERK'] },
  { to: '/admin/solicitudes', label: 'Solicitudes', icon: ClipboardList, roles: ['ADMIN', 'SUPERVISOR', 'CLERK'] },
  { to: '/admin/clientes', label: 'Clientes', icon: UsersRound, roles: ['ADMIN', 'SUPERVISOR', 'COLLECTOR', 'CLERK'] },
  { to: '/admin/prestamos', label: 'Préstamos', icon: Wallet, roles: ['ADMIN', 'SUPERVISOR', 'COLLECTOR', 'CLERK'] },
  { to: '/admin/pagos', label: 'Pagos', icon: Receipt, roles: ['ADMIN', 'SUPERVISOR', 'COLLECTOR', 'CLERK'] },
  { to: '/admin/reportes', label: 'Reportes', icon: BarChart3, roles: ['ADMIN', 'SUPERVISOR', 'COLLECTOR'] },
  { to: '/admin/usuarios', label: 'Usuarios', icon: UserRound, roles: ['ADMIN'] },
  { to: '/admin/configuracion', label: 'Configuración', icon: Settings, roles: ['ADMIN'] },
  { to: '/admin/auditoria', label: 'Auditoría', icon: FileText, roles: ['ADMIN'] },
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const visibleItems = navItems.filter((item) => user && item.roles.includes(user.role))

  return (
    <div className="min-h-screen bg-cream">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-forest-950 text-cream lg:flex">
        <div className="px-6 py-6">
          <Logo to="/admin" inverted />
        </div>
        <div className="mx-4 mb-4 rounded-2xl border border-cream/10 bg-cream/5 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Panel interno</p>
          <p className="mt-1 text-sm font-semibold">{roleLabels[user?.role || ''] || 'Equipo J&C'}</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                  isActive
                    ? 'bg-cream text-forest-950 shadow-sm'
                    : 'text-cream/60 hover:bg-cream/10 hover:text-cream',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-cream/10 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-cream/10 text-sm font-bold text-gold">
              {user?.name?.charAt(0) || 'J'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-cream">{user?.name}</p>
              <p className="truncate text-xs text-cream/45">{user?.email}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Link
              to="/"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cream/5 px-3 py-2 text-xs font-medium text-cream/60 transition hover:bg-cream/10 hover:text-cream"
            >
              <Landmark className="h-3.5 w-3.5" /> Sitio
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cream/5 px-3 py-2 text-xs font-medium text-cream/60 transition hover:bg-red-500/20 hover:text-red-100"
            >
              <LogOut className="h-3.5 w-3.5" /> Salir
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-forest-900/10 bg-cream/90 px-4 backdrop-blur-xl lg:hidden">
          <Logo to="/admin" compact />
          <div className="flex items-center gap-2">
            <span className="max-w-36 truncate text-sm font-semibold text-forest-950">
              {roleLabels[user?.role || ''] || 'Panel'}
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
          <div className="border-b border-forest-900/10 bg-forest-950 px-4 py-4 lg:hidden">
            <nav className="space-y-1">
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium',
                      isActive
                        ? 'bg-cream text-forest-950'
                        : 'text-cream/65 hover:bg-cream/10',
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
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-red-200 hover:bg-red-500/20"
              >
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </button>
            </nav>
          </div>
        )}

        <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
