import { useState, type JSX } from 'react';
import { type ReactNode } from 'react';
import { useBalanceSheet, useTrialBalance } from '../../../api/accounting-hooks';
import { ApiError } from '../../../api/api-error';
import { Card } from '../../../ui/Card';
import { Spinner } from '../../../ui/Spinner';
import { formatBdt, formatDate } from '../../../utils/format';
import type { BalanceSheetLine, TrialBalanceLine } from '../../../types/accounting';
import './AccountingStatements.css';
import { PrintReportAction } from '../../components/PrintReportAction';

type StatementView = 'trial-balance' | 'balance-sheet';

function AccountingTable({ children, label }: { children: ReactNode; label: string }): JSX.Element {
  return (
    <div className="accounting-statements__table-wrap">
      <table className="accounting-statements__table" aria-label={label}>
        {children}
      </table>
    </div>
  );
}

function BalanceSection({ title, rows }: { title: string; rows: BalanceSheetLine[] }): JSX.Element {
  return (
    <section className="accounting-statements__section" aria-label={title}>
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="accounting-statements__empty">No balances</p>
      ) : (
        <AccountingTable label={`${title} balances`}>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code}>
                <td>
                  <span className="accounting-statements__code">{row.code}</span>
                  {row.name}
                </td>
                <td className="accounting-statements__amount">{formatBdt(row.balanceMinor)}</td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      )}
    </section>
  );
}

function TrialBalanceRows({ rows }: { rows: TrialBalanceLine[] }): JSX.Element {
  const nonzeroRows = rows.filter(
    (row) => row.debitBalanceMinor !== 0 || row.creditBalanceMinor !== 0,
  );
  if (nonzeroRows.length === 0) {
    return <p className="accounting-statements__empty">No posted balances as of this date.</p>;
  }
  return (
    <AccountingTable label="Trial balance">
      <thead>
        <tr>
          <th scope="col">Account</th>
          <th scope="col" className="accounting-statements__amount">
            Debit
          </th>
          <th scope="col" className="accounting-statements__amount">
            Credit
          </th>
        </tr>
      </thead>
      <tbody>
        {nonzeroRows.map((row) => (
          <tr key={row.accountId}>
            <td>
              <span className="accounting-statements__code">{row.code}</span>
              {row.name}
            </td>
            <td className="accounting-statements__amount">
              {row.debitBalanceMinor ? formatBdt(row.debitBalanceMinor) : '—'}
            </td>
            <td className="accounting-statements__amount">
              {row.creditBalanceMinor ? formatBdt(row.creditBalanceMinor) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </AccountingTable>
  );
}

export function AccountingStatements({ asOf }: { asOf: string }): JSX.Element {
  const [view, setView] = useState<StatementView>('trial-balance');
  const trialBalance = useTrialBalance(asOf);
  const balanceSheet = useBalanceSheet(asOf);
  const query = view === 'trial-balance' ? trialBalance : balanceSheet;

  return (
    <div className="accounting-statements-print" data-printable-report>
      <PrintReportAction
        title={view === 'trial-balance' ? 'Trial balance' : 'Balance sheet'}
        subtitle={`As of ${formatDate(asOf)}`}
      />
      <Card title="Accounting statements" subtitle={`As of ${formatDate(asOf)}`}>
        <div
          className="accounting-statements__tabs"
          role="tablist"
          aria-label="Accounting statements"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'trial-balance'}
            aria-controls="trial-balance-panel"
            onClick={() => setView('trial-balance')}
          >
            Trial balance
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'balance-sheet'}
            aria-controls="balance-sheet-panel"
            onClick={() => setView('balance-sheet')}
          >
            Balance sheet
          </button>
        </div>

        {query.isLoading ? (
          <div className="accounts-page__center">
            <Spinner label="Loading accounting statement" />
          </div>
        ) : query.error ? (
          <p className="accounting-statements__error" role="alert">
            {query.error instanceof ApiError
              ? query.error.message
              : 'Unable to load accounting statement.'}
          </p>
        ) : view === 'trial-balance' && trialBalance.data ? (
          <div id="trial-balance-panel" role="tabpanel" aria-label="Trial balance">
            <TrialBalanceRows rows={trialBalance.data.lines} />
            <div
              className={`accounting-statements__totals ${
                trialBalance.data.totalDebitsMinor === trialBalance.data.totalCreditsMinor
                  ? 'is-balanced'
                  : 'is-unbalanced'
              }`}
              role="status"
            >
              <span>
                Total debits <strong>{formatBdt(trialBalance.data.totalDebitsMinor)}</strong>
              </span>
              <span>
                Total credits <strong>{formatBdt(trialBalance.data.totalCreditsMinor)}</strong>
              </span>
            </div>
          </div>
        ) : view === 'balance-sheet' && balanceSheet.data ? (
          <div id="balance-sheet-panel" role="tabpanel" aria-label="Balance sheet">
            <div className="accounting-statements__sections">
              <BalanceSection title="Assets" rows={balanceSheet.data.assets} />
              <BalanceSection title="Liabilities" rows={balanceSheet.data.liabilities} />
              <BalanceSection title="Equity" rows={balanceSheet.data.equity} />
            </div>
            <div
              className={`accounting-statements__totals ${
                balanceSheet.data.totalAssetsMinor ===
                balanceSheet.data.totalLiabilitiesAndEquityMinor
                  ? 'is-balanced'
                  : 'is-unbalanced'
              }`}
              role="status"
            >
              <span>
                Total assets <strong>{formatBdt(balanceSheet.data.totalAssetsMinor)}</strong>
              </span>
              <span>
                Liabilities + equity{' '}
                <strong>{formatBdt(balanceSheet.data.totalLiabilitiesAndEquityMinor)}</strong>
              </span>
            </div>
            <p className="accounting-statements__note">
              Earnings are cumulative revenue less expenses through this date; closing entries are
              not posted.
            </p>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
