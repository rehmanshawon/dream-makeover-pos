# Dream Makeover POS

Offline-first luxury beauty salon POS and business management system.

## Architecture

This is an npm workspaces monorepo.

| Package | Purpose |
|---|---|
| `backend` | NestJS API and business logic |
| `frontend` | React POS interface |
| `desktop` | Electron desktop shell |

## Prerequisites

- Node.js 20+
- npm 10+
- MySQL 8.x

## Development Setup

```bash
npm install
```

## Payroll Time Protection

The backend verifies time against `TIME_SYNC_URL` over HTTPS every 30 seconds. Payroll, attendance, and salary-payment APIs fail closed until time is verified, warn during the final two hours of the default eight-hour offline grace period, and lock when that period expires. A system-clock jump greater than two minutes locks payroll immediately. POS routes remain available. After a backend restart without network time, payroll stays locked until verification succeeds.

Configure `TIME_SYNC_URL`, `PAYROLL_OFFLINE_GRACE_HOURS`, and `PAYROLL_TIME_WARNING_HOURS` in `backend/.env`; defaults are shown in `backend/.env.example`.

## Accounting Journal (Initial Scope)

The Accounts area includes a double-entry cash/bank journal for owner contributions, owner withdrawals, and cash-to-bank transfers. New and existing operating expenses are also posted automatically by category and payment method; expense changes update their linked journal entry in the same transaction. Cash, bank, and mobile-wallet payments credit asset accounts; card and other payments credit payable/clearing accounts. Expense vouchers balance their debit and credit lines and save with the source expense in one database transaction. POS sales, inventory costs, and payroll are not yet posted here, so the ledger is not yet a complete business balance. Expense and manual voucher changes require trusted time; POS checkout remains available while posting is time-locked.

## Scripts
```bash
npm run lint
npm run format
npm run type-check
npm run test
npm run build
```

## License
Private and confidential.