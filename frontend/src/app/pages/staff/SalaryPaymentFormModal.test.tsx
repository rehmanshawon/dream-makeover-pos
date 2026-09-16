import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/render-with-providers';
import { SalaryPaymentFormModal } from './SalaryPaymentFormModal';
import type { AuthenticatedUser } from '../../../types/auth';
import type { Employee } from '../../../types/employees';

const ADMIN: AuthenticatedUser = {
  id: '1',
  username: 'admin',
  displayName: 'Admin',
  role: 'ADMIN',
};

const EMPLOYEE: Employee = {
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
};

describe('SalaryPaymentFormModal', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = 'http://test.local';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function renderModal(open = true): void {
    renderWithProviders(
      <SalaryPaymentFormModal open={open} employee={EMPLOYEE} onClose={() => undefined} />,
      { user: ADMIN, token: 'test-token' },
    );
  }

  it('prefills the amount with the configured salary', () => {
    renderModal();
    expect(screen.getByLabelText(/amount/i)).toHaveValue('35000.00');
  });

  it('shows the configured salary context', () => {
    renderModal();
    expect(screen.getByText(/35000\.00.*per month/i)).toBeInTheDocument();
  });

  it('submits a payment with defaults', async () => {
    const fetchSpy = vi.fn<typeof fetch>(async (_input, init) => {
      const body = JSON.parse(init?.body as string);
      expect(body.employeeId).toBe('e1');
      expect(body.amountMinor).toBe(3500000);
      expect(body.paymentType).toBe('REGULAR');
      expect(body.paymentMethod).toBe('CASH');
      return new Response(
        JSON.stringify({
          id: 'p1',
          employeeId: 'e1',
          amountMinor: body.amountMinor,
          paymentType: body.paymentType,
          paymentMethod: body.paymentMethod,
          paidOn: body.paidOn,
          note: null,
          paidBy: 'admin',
          createdAt: new Date().toISOString(),
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      );
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    renderModal();
    await userEvent.click(screen.getByRole('button', { name: /record payment/i }));

    await vi.waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  it('rejects zero amount', async () => {
    renderModal();
    const amount = screen.getByLabelText(/amount/i);
    await userEvent.clear(amount);
    await userEvent.type(amount, '0');
    await userEvent.click(screen.getByRole('button', { name: /record payment/i }));

    expect(await screen.findByText(/greater than 0/i)).toBeInTheDocument();
  });
});
