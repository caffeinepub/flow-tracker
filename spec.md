# Flow Tracker

## Current State

Flow Tracker is a mobile-first PWA personal finance tracker (v22). All data is stored in localStorage. The app has the following major sections: Dashboard, Add Transaction, History, Reports, Accounts (with IOU nested), Projections (with Financial Goals nested), Recurring, and Settings.

Current types: Config, Transaction, SalaryPeriod, Account, Goal, IOU, RecurringTransaction.
exportData and importData already exist in useFinanceData.ts.
Accounts.tsx has collapsible sections keyed by string using flow_accounts_sections in localStorage.
i18n/translations.ts has 82 keys; needs new keys for all new features.

## Requested Changes (Diff)

### Add

1. Bill Tracker (nested in Accounts tab, new collapsible section)
   - New Bill type: { id, name, amount, dueDayOfMonth (1-31), isPaidThisPeriod, notes? }
   - Bills stored in localStorage
   - CRUD: add, edit (name, amount, due day, notes), delete
   - Mark paid/unpaid per period
   - In-app alert banner: bills due within 3 days of today
   - Collapsible section in Accounts page, collapse state under key 'bills'

2. Data Backup & Restore (in Settings)
   - Export: serialize ALL Flow Tracker localStorage keys into a single JSON file, download as flow-tracker-backup-YYYY-MM-DD.json
   - Import: file picker for JSON, validate, restore all keys, reload app
   - Success/error toasts

3. Excess to Savings Prompt
   - When period-expired banner shows AND remaining > 0: prompt 'You have PX unspent - move to savings?'
   - Yes: pick savings goal or General Savings, log expense transaction
   - No: dismiss
   - Only show once per period (localStorage flag flow_excess_prompted_<periodId>)

4. User Guide (Help Tooltips)
   - '?' icon in header of each major section
   - Opens bottom Sheet with plain-language explanation in EN and Tagalog
   - Content in new file src/frontend/src/data/userGuide.ts
   - Simple language suitable for all ages

### Modify

- types/index.ts: add Bill interface
- hooks/useFinanceData.ts: add bills state, addBill, updateBill, deleteBill, toggleBillPaid; update exportData/importData to include bills
- pages/Accounts.tsx: add Bill Tracker collapsible section
- pages/Settings.tsx: add Data Backup section
- pages/Dashboard.tsx: integrate excess-to-savings prompt in period-expired banner
- i18n/translations.ts: add new translation keys

### Remove

- Nothing removed

## Implementation Plan

1. Add Bill interface to types/index.ts
2. Add bills state + CRUD callbacks to useFinanceData.ts, update export/import
3. Create data/userGuide.ts with EN/TL content for all sections
4. Update Accounts.tsx with Bill Tracker section (list, add/edit/delete dialog, due-soon banner, paid toggle)
5. Update Settings.tsx with Data Backup section (export + import buttons)
6. Update Dashboard.tsx with excess-to-savings prompt in period-expired banner flow
7. Update i18n/translations.ts with new keys
