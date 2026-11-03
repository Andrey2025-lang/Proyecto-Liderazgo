import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ProtectedRoute, RoleOnly } from '@/components/layout/ProtectedRoute'
import { HomePage } from '@/pages/public/HomePage'
import { HowItWorksPage } from '@/pages/public/HowItWorksPage'
import { RequirementsPage } from '@/pages/public/RequirementsPage'
import { FaqPage } from '@/pages/public/FaqPage'
import { PrivacyPage } from '@/pages/public/PrivacyPage'
import { LoginPage } from '@/pages/public/LoginPage'
import { RegisterPage } from '@/pages/public/RegisterPage'
import { ClientDashboardPage } from '@/pages/client/ClientDashboardPage'
import { ClientApplicationsPage } from '@/pages/client/ClientApplicationsPage'
import { NewApplicationPage } from '@/pages/client/NewApplicationPage'
import { ClientApplicationDetailPage } from '@/pages/client/ClientApplicationDetailPage'
import { ClientLoansPage } from '@/pages/client/ClientLoansPage'
import { ClientLoanDetailPage } from '@/pages/client/ClientLoanDetailPage'
import { ClientProfilePage } from '@/pages/client/ClientProfilePage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminApplicationsPage } from '@/pages/admin/AdminApplicationsPage'
import { AdminApplicationDetailPage } from '@/pages/admin/AdminApplicationDetailPage'
import { AdminClientsPage } from '@/pages/admin/AdminClientsPage'
import { AdminClientDetailPage } from '@/pages/admin/AdminClientDetailPage'
import { AdminLoansPage } from '@/pages/admin/AdminLoansPage'
import { AdminLoanDetailPage } from '@/pages/admin/AdminLoanDetailPage'
import { AdminPaymentsPage } from '@/pages/admin/AdminPaymentsPage'
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminIntakePage } from '@/pages/admin/AdminIntakePage'
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage'
import { AdminAuditPage } from '@/pages/admin/AdminAuditPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="como-funciona" element={<HowItWorksPage />} />
          <Route path="requisitos" element={<RequirementsPage />} />
          <Route path="preguntas" element={<FaqPage />} />
          <Route path="privacidad" element={<PrivacyPage />} />
        </Route>

        <Route path="login" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />

        <Route
          path="app"
          element={
            <ProtectedRoute roles={['CLIENT']}>
              <PortalLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ClientDashboardPage />} />
          <Route path="solicitudes" element={<ClientApplicationsPage />} />
          <Route path="solicitudes/nueva" element={<NewApplicationPage />} />
          <Route path="solicitudes/:id" element={<ClientApplicationDetailPage />} />
          <Route path="prestamos" element={<ClientLoansPage />} />
          <Route path="prestamos/:id" element={<ClientLoanDetailPage />} />
          <Route path="perfil" element={<ClientProfilePage />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>

        <Route
          path="admin"
          element={
            <ProtectedRoute roles={['ADMIN', 'SUPERVISOR', 'COLLECTOR', 'CLERK']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="recepcion" element={<RoleOnly roles={['ADMIN', 'SUPERVISOR', 'CLERK']}><AdminIntakePage /></RoleOnly>} />
          <Route
            path="solicitudes"
            element={
              <RoleOnly roles={['ADMIN', 'SUPERVISOR', 'CLERK']}>
                <AdminApplicationsPage />
              </RoleOnly>
            }
          />
          <Route
            path="solicitudes/:id"
            element={
              <RoleOnly roles={['ADMIN', 'SUPERVISOR', 'CLERK']}>
                <AdminApplicationDetailPage />
              </RoleOnly>
            }
          />
          <Route path="clientes" element={<AdminClientsPage />} />
          <Route path="clientes/:id" element={<AdminClientDetailPage />} />
          <Route path="prestamos" element={<AdminLoansPage />} />
          <Route path="prestamos/:id" element={<AdminLoanDetailPage />} />
          <Route path="pagos" element={<AdminPaymentsPage />} />
          <Route path="reportes" element={<RoleOnly roles={['ADMIN', 'SUPERVISOR', 'COLLECTOR']}><AdminReportsPage /></RoleOnly>} />
          <Route
            path="usuarios"
            element={
              <RoleOnly roles={['ADMIN']}>
                <AdminUsersPage />
              </RoleOnly>
            }
          />
          <Route
            path="configuracion"
            element={
              <RoleOnly roles={['ADMIN']}>
                <AdminSettingsPage />
              </RoleOnly>
            }
          />
          <Route
            path="auditoria"
            element={
              <RoleOnly roles={['ADMIN']}>
                <AdminAuditPage />
              </RoleOnly>
            }
          />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster position="top-right" richColors closeButton />
    </>
  )
}
