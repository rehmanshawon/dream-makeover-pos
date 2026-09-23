import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PayPeriodDetailPage } from './PayPeriodDetailPage';
import { renderWithProviders } from '../../../test/render-with-providers';

const deleteOne = vi.fn();
const deleteMany = vi.fn();

vi.mock('../../../api/payroll-hooks', () => ({
  usePayPeriod: () => ({
    data: {
      id: 'period-1',
      year: 2026,
      month: 9,
      name: 'September 2026',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      status: 'OPEN',
      closedAt: null,
      closedBy: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    isLoading: false,
    error: null,
  }),
  usePayables: () => ({
    data: [
      {
        employeeId: 'employee-1',
        employeeName: 'Asha Rahman',
        role: 'Stylist',
        monthlySalaryMinor: 3000000,
        payableMinor: 3000000,
        alreadyPaidMinor: 3000000,
        remainingMinor: 0,
        hasExistingPayment: true,
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useClosePayPeriod: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRunPayroll: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeletePayments: () => ({ mutateAsync: deleteMany, isPending: false }),
}));

vi.mock('../../../api/salary-payment-hooks', () => ({
  useSalaryPayments: () => ({
    data: [
      {
        id: 'payment-1',
        employeeId: 'employee-1',
        amountMinor: 3000000,
        paymentType: 'REGULAR',
        paymentMethod: 'CASH',
        paidOn: '2026-09-30',
        payPeriodId: 'period-1',
        note: null,
        paidBy: 'admin',
        createdAt: '2026-09-30T00:00:00.000Z',
      },
    ],
    isLoading: false,
    refetch: vi.fn(),
  }),
  useDeleteSalaryPayment: () => ({ mutateAsync: deleteOne, isPending: false }),
}));

describe('PayPeriodDetailPage', () => {
  it('renders recorded payments and deletes one after confirmation', async () => {
    const user = userEvent.setup();
    deleteOne.mockResolvedValue(undefined);
    renderWithProviders(<PayPeriodDetailPage />, { route: '/payroll/period-1' });

    expect(screen.getByText('Recorded payments')).toBeInTheDocument();
    expect(screen.getAllByText('Asha Rahman')).not.toHaveLength(0);
    expect(screen.getAllByText('৳30,000.00')).not.toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /^Delete$/i }));
    expect(screen.getByRole('heading', { name: 'Delete salary payment' })).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole('button', { name: /^Delete$/i });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    expect(deleteOne).toHaveBeenCalledWith({ id: 'payment-1', employeeId: 'employee-1' });
  });
});
