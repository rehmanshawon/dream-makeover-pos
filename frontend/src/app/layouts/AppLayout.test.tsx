import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, Route, Routes } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import type { AuthenticatedUser } from '../auth/AuthContext';
import { renderWithProviders } from '../../test/render-with-providers';
import { usePayrollTimeTrust } from '../../api/time-trust-hooks';

vi.mock('../../api/time-trust-hooks', () => ({
  usePayrollTimeTrust: vi.fn(),
}));

const mockedUsePayrollTimeTrust = vi.mocked(usePayrollTimeTrust);

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

function renderLayout(initialPath: string): void {
  renderWithProviders(
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route
          path="pos"
          element={
            <>
              <div>POS Page Content</div>
              <Link to="/customers">Open customers</Link>
            </>
          }
        />
        <Route path="customers" element={<div>Customers Page Content</div>} />
      </Route>
    </Routes>,
    { route: initialPath, user: ADMIN },
  );
}

describe('AppLayout', () => {
  beforeEach(() => {
    mockedUsePayrollTimeTrust.mockReturnValue({
      data: {
        state: 'ONLINE',
        payrollAllowed: true,
        warning: false,
        message: null,
        lastVerifiedAt: '2026-09-25T12:00:00.000Z',
        offlineForMs: 0,
        remainingMs: 28_800_000,
      },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof usePayrollTimeTrust>);
  });

  it('renders the POS page title in the topbar when at /pos', () => {
    renderLayout('/pos');
    expect(screen.getByRole('heading', { name: /new sale/i, level: 1 })).toBeInTheDocument();
  });

  it('renders the customers page title in the topbar when at /customers', () => {
    renderLayout('/customers');
    expect(screen.getByRole('heading', { name: /customers/i, level: 1 })).toBeInTheDocument();
  });

  it('renders the child route content inside the layout', () => {
    renderLayout('/pos');
    expect(screen.getByText('POS Page Content')).toBeInTheDocument();
  });

  it('keeps the sidebar visible across routes', () => {
    renderLayout('/customers');
    expect(screen.getByRole('complementary', { name: /primary navigation/i })).toBeInTheDocument();
  });

  it('navigates back to the previous app route from the topbar', async () => {
    const user = userEvent.setup();
    renderLayout('/pos');

    await user.click(screen.getByRole('link', { name: /open customers/i }));
    expect(screen.getByText('Customers Page Content')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /go back/i }));
    expect(screen.getByText('POS Page Content')).toBeInTheDocument();
  });

  it('returns to the dashboard when there is no earlier app history', async () => {
    const user = userEvent.setup();
    const previousHistoryState = window.history.state;
    window.history.replaceState({ idx: 0 }, '');

    renderLayout('/customers');

    await user.click(screen.getByRole('button', { name: /go back/i }));
    expect(screen.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeInTheDocument();

    window.history.replaceState(previousHistoryState, '');
  });

  it('does not render the obsolete manual pay-period reminder banner', () => {
    renderLayout('/pos');
    expect(screen.queryByText(/pay period has not been created yet/i)).not.toBeInTheDocument();
  });

  it('warns about expiring time trust while keeping POS available', () => {
    mockedUsePayrollTimeTrust.mockReturnValue({
      data: {
        state: 'OFFLINE_WARNING',
        payrollAllowed: true,
        warning: true,
        message: 'Network time is unavailable.',
        lastVerifiedAt: '2026-09-25T12:00:00.000Z',
        offlineForMs: 6 * 60 * 60_000,
        remainingMs: 2 * 60 * 60_000,
      },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof usePayrollTimeTrust>);

    renderLayout('/pos');

    expect(screen.getByRole('status')).toHaveTextContent('About 2 hour(s) remain');
    expect(screen.getByText('POS Page Content')).toBeInTheDocument();
  });
});
