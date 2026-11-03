import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import type { Role } from '@/lib/types'

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-cream text-sm text-ink/50">
      <Loader2 className="h-7 w-7 animate-spin text-forest-700" />
      <span>Cargando tu espacio…</span>
    </div>
  )
}

export function ProtectedRoute({
  roles,
  children,
}: {
  roles?: Role[]
  children: ReactNode
}) {
  const { user, loading, homeForRole } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />
  }
  return <>{children}</>
}

export function RoleOnly({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading, homeForRole } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />
  return <>{children}</>
}
