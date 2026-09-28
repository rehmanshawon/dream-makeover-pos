import type { JSX, ReactNode } from 'react';
import { usePayrollTimeTrust } from '../../api/time-trust-hooks';
import './PayrollTimeGate.css';

interface PayrollTimeGateProps {
  children: ReactNode;
}

export function PayrollTimeGate({ children }: PayrollTimeGateProps): JSX.Element {
  const timeTrust = usePayrollTimeTrust();

  if (timeTrust.isLoading || !timeTrust.data || timeTrust.isError) {
    return (
      <section className="payroll-time-gate" role="alert">
        <h2>Payroll temporarily unavailable</h2>
        <p>
          Trusted time could not be verified. Payroll actions are locked; POS operations remain
          available.
        </p>
      </section>
    );
  }

  if (!timeTrust.data.payrollAllowed) {
    return (
      <section className="payroll-time-gate" role="alert">
        <h2>Payroll locked</h2>
        <p>{timeTrust.data.message ?? 'Payroll is unavailable until trusted time is verified.'}</p>
        <p>POS operations remain available.</p>
      </section>
    );
  }

  return <>{children}</>;
}
