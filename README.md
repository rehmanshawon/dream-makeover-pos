# Dream Makeover POS

Offline-first point-of-sale and business management system for Dream Makeover, a beauty salon and retail business.

## Architecture

This is an npm workspaces monorepo.

| Package | Purpose |
|---|---|
| `backend` | NestJS API and business logic |
| `frontend` | React POS interface |
| `desktop` | Electron desktop shell and Windows installer |

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

## Current Features

- POS checkout for products, services, and packages, with customer, discount, VAT, and payment handling.
- Customer and loyalty records, product and service catalogs, inventory tracking, purchasing, supplier returns, and inventory cost adjustments.
- Employee records, attendance, pay periods, salary payments, advances, and payslips. Payroll and attendance actions require trusted time; POS checkout remains available while payroll is time-locked.
- Business reports for sales, revenue trends, top items, expenses, and financial summaries.
- A4 print / Save as PDF actions for sales, operating expenses, inventory on hand, P&L, trial balance, balance sheet, and payroll period reports.
- POS receipt printing through browser print, Web Bluetooth ESC/POS, or the Windows Electron desktop app.

## Accounting Scope

The Accounts area uses a double-entry journal. It includes owner contributions and withdrawals, cash/bank transfers, automatic postings for sales, expenses, purchases, payroll payments, customer and supplier returns, inventory adjustments, and cost revaluations. The Accounts area also includes bank reconciliation, a trial balance, a balance sheet, and a practical operating P&L.

Admins can close completed accounting months. Journal changes in a closed month are blocked; corrections are recorded as linked reversing entries in an open month. Reversing an accounting entry does not undo its source business transaction, which must be corrected through its own workflow.

The operating P&L currently estimates cost of goods sold using current product purchase cost rather than a historical cost snapshot for each sale. Tax/statutory reports and a formal cash-flow statement have not been implemented; confirm local requirements with an accountant before relying on statutory outputs. This software is not a substitute for professional accounting advice.

## Receipt Printing

Browser receipt printing opens the system print dialog. For thermal output, select the installed receipt printer and its 80mm paper profile in the browser/OS print settings; the receipt formatter uses a 48-column layout. Web Bluetooth printing requires a supported Chromium browser and a compatible paired ESC/POS printer. General A4 reports use the browser print dialog and can be saved as PDF.

## Database Migrations

The backend is configured to run pending TypeORM migrations at startup. Back up the database before deploying updates, and verify startup logs and the resulting schema when a migration is introduced. Do not point integration tests at the business database; use `DB_DATABASE=dream_makeover_test`.

## Desktop Status

Run `npm run desktop:dev` to start the web frontend and Electron shell together. The desktop app uses Chromium Web Bluetooth for compatible BLE ESC/POS printers and presents a native Windows device chooser when more than one compatible printer is discovered. The existing backend and MySQL database must be running, and the backend CORS configuration must allow `http://localhost:5173`.

Run `npm run desktop:package:win` on Windows to build an NSIS installer in `desktop/release`. Configure `frontend/.env` with the backend API URL before building; the installer packages the frontend and Electron shell, not the backend or database.

## Scripts
```bash
npm run lint
npm run format
npm run type-check
npm run test
npm run build
npm run ci:all
```

## License
Private and confidential.