import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { RootLayout } from '@/components/layout/RootLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { CatalogPage } from '@/pages/public/CatalogPage'
import { ProductDetailPage } from '@/pages/public/ProductDetailPage'
import { CheckoutPage } from '@/pages/public/CheckoutPage'
import { OrderPaymentPage } from '@/pages/public/OrderPaymentPage'
import { ConfiguratorPage } from '@/pages/public/ConfiguratorPage'
import { AdminDashboard } from '@/pages/private/AdminDashboard'
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage'
import { AdminProductFormPage } from '@/pages/admin/AdminProductFormPage'
import { AdminProfessionalsPage } from '@/pages/admin/AdminProfessionalsPage'
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage'
import { CustomerDashboard } from '@/pages/private/CustomerDashboard'
import { CustomerOrderDetailPage } from '@/pages/private/CustomerOrderDetailPage'
import HomePage from '@/pages/public/HomePage'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { ProLayout } from '@/components/layouts/ProLayout'
import { DashboardPage } from '@/pages/pro/DashboardPage'
import { JobsPage } from '@/pages/pro/JobsPage'
import { JobDetailPage } from '@/pages/pro/JobDetailPage'
import { CalendarPage } from '@/pages/pro/CalendarPage'
import { ProfilePage } from '@/pages/pro/ProfilePage'

// Booking Pages
import { ProfessionalSelectionPage } from '@/pages/booking/ProfessionalSelectionPage'
import { CalendarSelectionPage } from '@/pages/booking/CalendarSelectionPage'
import { BookingConfirmPage } from '@/pages/booking/BookingConfirmPage'
import { BookingSuccessPage } from '@/pages/booking/BookingSuccessPage'

import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { UnauthorizedPage } from '@/pages/auth/UnauthorizedPage'
import { InviteAcceptPage } from '@/pages/auth/InviteAcceptPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { InviteHandler } from '@/components/auth/InviteHandler'

import { Toaster } from 'sonner'

const NotFoundPage = () => <div className="p-8 text-red-500">404 Pagina non trovata</div>

// Placeholder pages for admin sections not yet implemented
const AdminCustomersPage = () => <div className="p-6"><h1 className="text-2xl font-bold">Gestione Clienti</h1><p className="text-gray-500 mt-2">In arrivo...</p></div>
const AdminSettingsPage = () => <div className="p-6"><h1 className="text-2xl font-bold">Impostazioni</h1><p className="text-gray-500 mt-2">In arrivo...</p></div>

function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" closeButton />
      <InviteHandler />
      <ScrollToTop />
      <Routes>
        {/* Auth Routes */}
        <Route path="/invite-accept" element={<InviteAcceptPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Admin Routes with AdminLayout */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <RootLayout>
                <AdminLayout />
              </RootLayout>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/new" element={<AdminProductFormPage />} />
          <Route path="products/:id" element={<AdminProductFormPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="professionals" element={<AdminProfessionalsPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        {/* Configurator - Full page, no layout */}
        <Route path="/configuratore" element={<ConfiguratorPage />} />

        {/* Protected Routes - Professional Only (NO RootLayout, has own ProLayout) */}
        <Route path="/pro" element={
          <ProtectedRoute allowedRoles={['admin', 'professional']}>
            <ProLayout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/:id" element={<JobDetailPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Booking Flow Routes - Protected */}
        <Route path="/booking" element={
          <ProtectedRoute allowedRoles={['customer', 'professional', 'admin']}>
            <RootLayout> {/* Wrap in RootLayout if you want header/footer, or rely on internal layout */}
              <Outlet /> {/* Fragment equivalent for wrapper since Outlet is handled by Router */}
            </RootLayout>
          </ProtectedRoute>
        }>
          <Route path="professionals" element={<ProfessionalSelectionPage />} />
          <Route path="calendar/:professionalId" element={<CalendarSelectionPage />} />
          <Route path="confirm" element={<BookingConfirmPage />} />
          <Route path="success" element={<BookingSuccessPage />} />
        </Route>

        {/* Public & Protected Routes with Layout */}
        <Route element={<RootLayout />}>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CheckoutPage />} />
          <Route
            path="/checkout/pay/:id"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <OrderPaymentPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes - Customer Only */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['customer']}>
              <Outlet />
            </ProtectedRoute>
          }>
            <Route index element={<CustomerDashboard />} />
            <Route path="orders/:id" element={<CustomerOrderDetailPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
