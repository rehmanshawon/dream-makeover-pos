import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { StaffPage } from './StaffPage';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

const EMPLOYEES = [
  {
    id: 'e1',
    fullName: 'Rina Akter',
    role: 'Senior Stylist',
    salaryMinor: 3500000,
    salaryFrequency: 'MONTHLY',
    joinDate: '2025-06-15',
    status: 'ACTIVE',
    phone: '01711111111',
    note: null,
    createdAt: '2025-06-15T00:00:00.000Z',
    updatedAt: '2025-06-15T00:00:00.000Z',
  },
  {
    id: 'e2',
    fullName: 'Karim Uddin',
    role: 'Cleaner',
    salaryMinor: 1500000,
    salaryFrequency: 'MONTHLY',
    joinDate: '2024-01-01',
    status: 'INACTIVE',
    phone: null,
    note: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

describe('StaffPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockEmployees(): void {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(EMPLOYEES), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;
  }

  function renderPage(): void {
    renderWithProviders(
      <Routes>
        <Route path="/staff" element={<StaffPage />} />
      </Routes>,
      { route: '/staff', user: ADMIN, token: 'test-token' },
    );
  }

  it('renders the list of employees', async () => {
    mockEmployees();
    renderPage();

    expect(await screen.findByText('Rina Akter')).toBeInTheDocument();
    expect(screen.getByText('Karim Uddin')).toBeInTheDocument();
  });

  it('shows salary with frequency', async () => {
    mockEmployees();
    renderPage();

    expect(await screen.findByText(/35,000\.00/)).toBeInTheDocument();
    const rinaRow = screen.getByRole('row', { name: /Rina Akter/ });
    expect(within(rinaRow).getByText(/\/ monthly/i)).toBeInTheDocument();
  });

  it('filters by status', async () => {
    mockEmployees();
    renderPage();

    await screen.findByText('Rina Akter');

    const statusGroup = screen.getByRole('group', { name: /status filter/i });
    await userEvent.click(within(statusGroup).getByRole('button', { name: /^active$/i }));

    expect(screen.getByText('Rina Akter')).toBeInTheDocument();
    expect(screen.queryByText('Karim Uddin')).not.toBeInTheDocument();
  });

  it('searches by name or role', async () => {
    mockEmployees();
    renderPage();

    await screen.findByText('Rina Akter');

    const search = screen.getByPlaceholderText(/search by name or role/i);
    await userEvent.type(search, 'clean');

    expect(screen.queryByText('Rina Akter')).not.toBeInTheDocument();
    expect(screen.getByText('Karim Uddin')).toBeInTheDocument();
  });

  it('opens the create modal', async () => {
    mockEmployees();
    renderPage();

    await screen.findByText('Rina Akter');
    await userEvent.click(screen.getByRole('button', { name: /new employee/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it('opens the edit modal with prefilled values', async () => {
    mockEmployees();
    renderPage();

    await screen.findByText('Rina Akter');

    const editButtons = screen.getAllByRole('button', { name: /^edit$/i });
    await userEvent.click(editButtons[0]!);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('Rina Akter')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Senior Stylist')).toBeInTheDocument();
  });
});
