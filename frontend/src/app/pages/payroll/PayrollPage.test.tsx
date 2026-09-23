import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PayrollPage } from './PayrollPage';
import { renderWithProviders } from '../../../test/render-with-providers';

const mutateAsync = vi.fn();
const deleteMutateAsync = vi.fn();

const payPeriod = {
  id: 'period-1',
  year: 2026,
  month: 8,
  name: 'August 2026',
  startDate: '2026-08-01',
  endDate: '2026-08-31',
  status: 'OPEN' as const,
  closedAt: null,
  closedBy: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

vi.mock('../../../api/payroll-hooks', () => ({
  usePayPeriods: () => ({ data: [payPeriod], isLoading: false, error: null }),
  useCreatePayPeriod: () => ({ mutateAsync, isPending: false }),
  useDeletePayPeriod: () => ({ mutateAsync: deleteMutateAsync, isPending: false }),
}));

describe('PayrollPage', () => {
  it('creates a pay period using the selected month and year', async () => {
    const user = userEvent.setup();
    mutateAsync.mockResolvedValue({ id: 'period-1' });
    renderWithProviders(<PayrollPage />);

    await user.click(screen.getByRole('button', { name: 'New pay period' }));
    expect(screen.getByRole('heading', { name: 'New pay period' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Month'), '8');
    await user.selectOptions(screen.getByLabelText('Year'), '2026');
    await user.click(screen.getByRole('button', { name: 'Create period' }));

    expect(mutateAsync).toHaveBeenCalledWith({ year: 2026, month: 8 });
  });

  it('confirms deletion of an open pay period', async () => {
    const user = userEvent.setup();
    deleteMutateAsync.mockResolvedValue(undefined);
    renderWithProviders(<PayrollPage />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('heading', { name: 'Delete pay period' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete period' }));

    expect(deleteMutateAsync).toHaveBeenCalledWith('period-1');
  });
});
