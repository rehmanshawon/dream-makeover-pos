import type { JSX } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './app/auth/AuthContext';
import { ProtectedRoute } from './app/auth/ProtectedRoute';
import { AdminRoute } from './app/auth/AdminRoute';
import { RedirectIfAuthenticated } from './app/auth/RedirectIfAuthenticated';
import { AppLayout } from './app/layouts/AppLayout';
import { LoginPage } from './app/pages/LoginPage';
import { DashboardPage } from './app/pages/DashboardPage';
import { NewSalePage } from './app/pages/pos/NewSalePage';
import { ServicesPage } from './app/pages/services/ServicesPage';
import { CategoryProductsPage } from './app/pages/products/CategoryProductsPage';
import { ProductDetailPage } from './app/pages/products/ProductDetailPage';
import { StockPage } from './app/pages/StockPage';
import { PackagesPage } from './app/pages/PackagesPage';
import { CustomersPage } from './app/pages/customers/CustomersPage';
import { CustomerDetailPage } from './app/pages/customers/CustomerDetailPage';
import { SalesReportPage } from './app/pages/SalesReportPage';
import { AccountsPage } from './app/pages/AccountsPage';
import { StaffPage } from './app/pages/StaffPage';
import { ExpenditurePage } from './app/pages/ExpenditurePage';
import { SettingsPage } from './app/pages/SettingsPage';

/**
 * Top-level application. Provides auth context and routing.
 *
 * Route structure:
 * - /login is public, but authenticated users are redirected away.
 * - All other routes require authentication.
 * - Admin-only pages are wrapped in AdminRoute in addition to
 *   ProtectedRoute.
 */
export function App(): JSX.Element {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthenticated>
                <LoginPage />
              </RedirectIfAuthenticated>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={
                <AdminRoute>
                  <DashboardPage />
                </AdminRoute>
              }
            />
            <Route path="pos" element={<NewSalePage />} />
            <Route path="parlour" element={<ServicesPage />} />
            <Route path="cosmetics" element={<CategoryProductsPage slug="cosmetics" />} />
            <Route path="shari" element={<CategoryProductsPage slug="shari" />} />
            <Route path="three-piece" element={<CategoryProductsPage slug="three-piece" />} />
            <Route path="products/:id" element={<ProductDetailPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="packages" element={<PackagesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route
              path="sales-report"
              element={
                <AdminRoute>
                  <SalesReportPage />
                </AdminRoute>
              }
            />
            <Route
              path="accounts"
              element={
                <AdminRoute>
                  <AccountsPage />
                </AdminRoute>
              }
            />
            <Route
              path="staff"
              element={
                <AdminRoute>
                  <StaffPage />
                </AdminRoute>
              }
            />
            <Route
              path="expenditure"
              element={
                <AdminRoute>
                  <ExpenditurePage />
                </AdminRoute>
              }
            />
            <Route
              path="settings"
              element={
                <AdminRoute>
                  <SettingsPage />
                </AdminRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
