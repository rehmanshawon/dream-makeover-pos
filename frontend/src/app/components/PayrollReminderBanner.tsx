import { useEffect, useState, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { useNextPayPeriodReminder } from '../../api/payroll-hooks';
import { useAuth } from '../auth/AuthContext';
import './PayrollReminderBanner.css';

const DISMISS_KEY_PREFIX = 'dream-makeover.payroll-reminder-dismissed';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * A dismissible banner shown in the last week of the month when the
 * next month's pay period has not yet been created.
 *
 * Dismissal is per-day, tracked in localStorage.
 */
export function PayrollReminderBanner(): JSX.Element | null {
  const { data } = useNextPayPeriodReminder();
  const [dismissed, setDismissed] = useState(false);

  const { isAdmin } = useAuth();
  if (!isAdmin) return null;

  useEffect(() => {
    const key = `${DISMISS_KEY_PREFIX}:${todayKey()}`;
    setDismissed(window.localStorage.getItem(key) === '1');
  }, []);

  if (!data?.shouldRemind || dismissed) return null;

  const handleDismiss = (): void => {
    const key = `${DISMISS_KEY_PREFIX}:${todayKey()}`;
    window.localStorage.setItem(key, '1');
    setDismissed(true);
  };

  return (
    <div className="payroll-reminder" role="status">
      <span className="payroll-reminder__text">
        <strong>{data.nextMonth.name}</strong> pay period has not been created yet. It is the last
        week of the month.
      </span>
      <Link to="/payroll" className="payroll-reminder__action">
        Go to payroll
      </Link>
      <button
        type="button"
        className="payroll-reminder__dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss reminder"
      >
        ×
      </button>
    </div>
  );
}
