import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PayrollPage } from './PayrollPage';
import { renderWithProviders } from '../../../test/render-with-providers';

const mutateAsync = vi.fn();

vi.mock('../../../api/payroll-hooks', () => ({
  usePayPeriods: () => ({ data: [], isLoading: false, error: null }),
  useCreatePayPeriod: () => ({ mutateAsync, isPending: false }),
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
});
