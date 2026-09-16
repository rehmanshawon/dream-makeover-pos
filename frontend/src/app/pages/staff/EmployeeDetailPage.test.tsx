import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { EmployeeDetailPage } from './EmployeeDetailPage';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

describe('EmployeeDetailPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function renderPage(): void {
    renderWithProviders(
      <Routes>
        <Route path="/staff/:id" element={<EmployeeDetailPage />} />
      </Routes>,
      { route: '/staff/e1', user: ADMIN, token: 'test-token' },
    );
  }

  it('renders employee details', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'e1',
            fullName: 'Rina Akter',
            role: 'Senior Stylist',
            salaryMinor: 3500000,
            salaryFrequency: 'MONTHLY',
            joinDate: '2025-06-15',
            status: 'ACTIVE',
            phone: '01711111111',
            note: 'Star performer',
            createdAt: '2025-06-15T00:00:00.000Z',
            updatedAt: '2025-06-15T00:00:00.000Z',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    ) as unknown as typeof fetch;

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Rina Akter' })).toBeInTheDocument();
    expect(screen.getByText(/35,000\.00/)).toBeInTheDocument();
    expect(screen.getByText('01711111111')).toBeInTheDocument();
    expect(screen.getByText('Star performer')).toBeInTheDocument();
  });

  it('shows a not-found message on 404', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ statusCode: 404, message: 'Employee not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    renderPage();

    expect(await screen.findByText(/employee not found/i)).toBeInTheDocument();
  });
});
