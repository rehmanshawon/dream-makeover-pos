import type { JSX } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, type AuthenticatedUser } from './app/auth/AuthContext';
import { AppLayout } from './app/layouts/AppLayout';
import { DashboardPage } from './app/pages/DashboardPage';
import { NewSalePage } from './app/pages/NewSalePage';
import { ParlourServicePage } from './app/pages/ParlourServicePage';
import { CosmeticsPage } from './app/pages/CosmeticsPage';
import { ShariPage } from './app/pages/ShariPage';
import { ThreePiecePage } from './app/pages/ThreePiecePage';
import { StockPage } from './app/pages/StockPage';
import { PackagesPage } from './app/pages/PackagesPage';
import { CustomersPage } from './app/pages/CustomersPage';
import { SalesReportPage } from './app/pages/SalesReportPage';
import { AccountsPage } from './app/pages/AccountsPage';
import { StaffPage } from './app/pages/StaffPage';
import { ExpenditurePage } from './app/pages/ExpenditurePage';
import { SettingsPage } from './app/pages/SettingsPage';

/**
 * Placeholder authenticated user.
 *
 * Sprint 11 replaces this with a real login flow. For now the layout
 * exercises admin-visible navigation.
 */
const PLACEHOLDER_USER: AuthenticatedUser = {
  id: 'placeholder',
  username: 'admin',
  displayName: 'Administrator',
  role: 'ADMIN',
};

interface AppProps {
  user?: AuthenticatedUser | null;
}

export function App({ user = PLACEHOLDER_USER }: AppProps): JSX.Element {
  return (
    <AuthProvider user={user}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="pos" element={<NewSalePage />} />
            <Route path="parlour" element={<ParlourServicePage />} />
            <Route path="cosmetics" element={<CosmeticsPage />} />
            <Route path="shari" element={<ShariPage />} />
            <Route path="three-piece" element={<ThreePiecePage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="packages" element={<PackagesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="sales-report" element={<SalesReportPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="expenditure" element={<ExpenditurePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
