import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { PayrollTimeGate } from './PayrollTimeGate';
import { usePayrollTimeTrust } from '../../api/time-trust-hooks';
import { renderWithProviders } from '../../test/render-with-providers';

vi.mock('../../api/time-trust-hooks', () => ({
  usePayrollTimeTrust: vi.fn(),
}));

const mockedUsePayrollTimeTrust = vi.mocked(usePayrollTimeTrust);

describe('PayrollTimeGate', () => {
  it('blocks payroll pages when trusted time is unavailable', () => {
    mockedUsePayrollTimeTrust.mockReturnValue({
      data: {
        state: 'LOCKED',
        payrollAllowed: false,
        warning: true,
        message: 'Trusted time expired.',
        lastVerifiedAt: null,
        offlineForMs: null,
        remainingMs: 0,
      },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof usePayrollTimeTrust>);

    renderWithProviders(
      <PayrollTimeGate>
        <div>Payroll content</div>
      </PayrollTimeGate>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Trusted time expired.');
    expect(screen.getByRole('alert')).toHaveTextContent('POS operations remain available.');
    expect(screen.queryByText('Payroll content')).not.toBeInTheDocument();
  });
});
