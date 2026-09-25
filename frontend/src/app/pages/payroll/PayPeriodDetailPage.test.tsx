import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { PayPeriodDetailPage } from './PayPeriodDetailPage';
import { renderWithProviders } from '../../../test/render-with-providers';

const { runPayrollMock } = vi.hoisted(() => ({ runPayrollMock: vi.fn() }));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useParams: () => ({ id: 'period-1' }) };
});

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
        currentObligationMinor: 3000000,
        carriedArrearsMinor: 0,
        totalDueMinor: 3000000,
        alreadyPaidMinor: 3000000,
        remainingMinor: 0,
        advanceMinor: 0,
        hasExistingPayment: true,
      },
      {
        employeeId: 'employee-2',
        employeeName: 'Mina Akter',
        role: 'Assistant',
        joinDate: '2026-09-01',
        monthlySalaryMinor: 2400000,
        payableMinor: 2400000,
        currentObligationMinor: 2400000,
        carriedArrearsMinor: 0,
        totalDueMinor: 2400000,
        alreadyPaidMinor: 0,
        remainingMinor: 2400000,
        advanceMinor: 0,
        hasExistingPayment: false,
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useClosePayPeriod: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRunPayroll: () => ({ mutateAsync: runPayrollMock, isPending: false }),
  useCreatePayrollSalaryPayment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAdjustAdvance: () => ({ mutateAsync: vi.fn(), isPending: false }),
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
}));

describe('PayPeriodDetailPage', () => {
  it('runs payroll only for the selected employee', async () => {
    runPayrollMock.mockResolvedValue({});
    renderWithProviders(<PayPeriodDetailPage />, { route: '/payroll/period-1' });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Mina Akter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run selected (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run payroll' }));

    await waitFor(() =>
      expect(runPayrollMock).toHaveBeenCalledWith({
        periodId: 'period-1',
        payload: { employeeIds: ['employee-2'] },
      }),
    );
  });

  it('renders recorded payments without offering deletion', () => {
    renderWithProviders(<PayPeriodDetailPage />, { route: '/payroll/period-1' });

    expect(screen.getByText('Recorded payments')).toBeInTheDocument();
    expect(screen.getAllByText('Asha Rahman')).not.toHaveLength(0);
    expect(screen.getAllByText('৳30,000.00')).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Attendance for Asha Rahman' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select Asha Rahman' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Adjust advance for Asha Rahman' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Pay partial salary for Asha Rahman' }),
    ).toBeDisabled();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});
