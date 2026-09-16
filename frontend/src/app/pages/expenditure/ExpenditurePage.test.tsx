import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/render-with-providers';
import { ExpenditurePage } from './ExpenditurePage';
import type { AuthenticatedUser } from '../../../types/auth';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

const EXPENSES = [
  {
    id: 'x1',
    category: 'ELECTRICITY',
    amountMinor: 250000,
    expenseDate: '2026-09-15',
    paymentMethod: 'CASH',
    payee: 'DESCO',
    reference: 'Bill #12345',
    note: null,
    createdBy: 'admin',
    createdAt: '2026-09-15T10:00:00.000Z',
    updatedAt: '2026-09-15T10:00:00.000Z',
  },
  {
    id: 'x2',
    category: 'CLEANING',
    amountMinor: 50000,
    expenseDate: '2026-09-10',
    paymentMethod: 'CASH',
    payee: 'Local vendor',
    reference: null,
    note: 'Weekly cleaning supplies',
    createdBy: 'admin',
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
  },
];

describe('ExpenditurePage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockExpenses(): void {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(EXPENSES), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;
  }

  function renderPage(): void {
    renderWithProviders(
      <Routes>
        <Route path="/expenditure" element={<ExpenditurePage />} />
      </Routes>,
      { route: '/expenditure', user: ADMIN, token: 'test-token' },
    );
  }

  it('renders the expense list', async () => {
    mockExpenses();
    renderPage();

    expect(await screen.findByText('DESCO')).toBeInTheDocument();
    expect(screen.getByText('Local vendor')).toBeInTheDocument();
    expect(screen.getByText('৳2,500.00')).toBeInTheDocument();
    expect(screen.getByText('৳500.00')).toBeInTheDocument();
  });

  it('renders category labels', async () => {
    mockExpenses();
    renderPage();

    expect(await screen.findByText('Electricity')).toBeInTheDocument();
    expect(screen.getByText('Cleaning')).toBeInTheDocument();
  });

  it('renders the summary cards', async () => {
    mockExpenses();
    renderPage();

    const totalLabel = await screen.findByText(/^total$/i);
    const totalCard = totalLabel.closest('.kpi-card');
    expect(totalCard).not.toBeNull();
    expect(await within(totalCard as HTMLElement).findByText('৳3,000.00')).toBeInTheDocument();
  });

  it('searches by payee', async () => {
    mockExpenses();
    renderPage();

    await screen.findByText('DESCO');

    const search = screen.getByPlaceholderText(/search payee/i);
    await userEvent.type(search, 'desco');

    expect(screen.queryByText('Local vendor')).not.toBeInTheDocument();
    expect(screen.getByText('DESCO')).toBeInTheDocument();
  });

  it('searches by note', async () => {
    mockExpenses();
    renderPage();

    await screen.findByText('DESCO');

    const search = screen.getByPlaceholderText(/search payee/i);
    await userEvent.type(search, 'cleaning supplies');

    expect(screen.queryByText('DESCO')).not.toBeInTheDocument();
    expect(screen.getByText('Local vendor')).toBeInTheDocument();
  });

  it('opens the create modal', async () => {
    mockExpenses();
    renderPage();

    await screen.findByText('DESCO');
    await userEvent.click(screen.getByRole('button', { name: /new expense/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/category/i)).toBeInTheDocument();
  });

  it('opens the edit modal with prefilled values', async () => {
    mockExpenses();
    renderPage();

    await screen.findByText('DESCO');

    const editButtons = screen.getAllByRole('button', { name: /^edit$/i });
    await userEvent.click(editButtons[0]!);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('DESCO')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('2500.00')).toBeInTheDocument();
  });

  it('shows a delete confirmation and calls the delete endpoint', async () => {
    let deleteCalled = false;

    globalThis.fetch = vi.fn(async (_input, init) => {
      const method = init?.method ?? 'GET';
      if (method === 'DELETE') {
        deleteCalled = true;
        return new Response(null, { status: 204 });
      }
      return new Response(JSON.stringify(EXPENSES), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    renderPage();

    await screen.findByText('DESCO');

    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i });
    await userEvent.click(deleteButtons[0]!);

    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    await vi.waitFor(() => {
      expect(deleteCalled).toBe(true);
    });
  });

  it('shows an empty state when there are no expenses', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    renderPage();

    expect(await screen.findByText(/no expenses in this range/i)).toBeInTheDocument();
  });
});
