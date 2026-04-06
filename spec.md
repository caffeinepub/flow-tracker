# Flow Tracker

## Current State
Flow Tracker is a mobile-first, offline-first PWA for personal finance tracking. It has accounts with sub-accounts, transactions (income/expense/transfer/save-to-goal), recurring rules, bill tracker, IOU tracker, notes, projections with scenario sliders and subcategory breakdown, reports with YTD summaries, and next period planning. Data is stored in localStorage.

## Requested Changes (Diff)

### Add
- **Split Expense** — optional toggle on Add Transaction (expense type only); enter full amount and other person's share; app records only your share as expense, adjusts account balance by full amount, and auto-logs an IOU (Lent) for the other person's portion
- **Built-in Calculator** — calculator keypad modal on the amount field in AddTransaction; supports +, -, ×, ÷, decimal, backspace, equals, confirm; result populates amount field
- **Update App button in Settings** — checks for waiting Service Worker, triggers skipWaiting and reload; shows version info and last updated date; displays "Up to date" or "Update available"
- **Help / User Manual in Settings** — dedicated collapsible section with tabbed device guides (Android, iPhone, Desktop), feature overview, update instructions, backup/restore guide; available in English and Tagalog
- `isOpeningBalance: boolean` flag on Transaction type — used to exclude opening balance entries from income reports

### Modify
- **Reports > Income** — filter out transactions where `isOpeningBalance === true` from income totals and income breakdown by source
- **Transfer dialog (Accounts)** — From and To dropdowns include sub-accounts listed under their parent account, indented with parent name prefix (e.g. "OwnBank › Parked Funds")
- **Sub-account detail view** — add `pb-24` bottom padding so content is not hidden behind bottom nav bar
- **Next Period Planning form (Settings)** — add category allocation step after dates and income; show all categories with per-category budget inputs respecting global %/₱ toggle; show running total vs expected income; warn if allocations don't match; save allocations into `nextPeriodDraft.customCategories`
- **Recurring `getNextDue`** — when `lastGenerated` is null, return `startDate` directly instead of `startDate + 1 interval`
- **Subcategory Breakdown (Projections)** — multiply `monthly` by `salaryRatio` so scenario income slider affects the breakdown amounts
- **Scenario Sliders section (Projections)** — add subtitle "Simulation only — changes are not saved"; add plain-language description under each slider; show saved base value for reference; add reset button to restore slider to saved base
- **Opening balance transaction logging** — add `isOpeningBalance: true` flag when logging opening balance income transaction for sub-accounts

### Remove
- Nothing removed

## Implementation Plan
1. Add `isOpeningBalance?: boolean` to Transaction type in `types/index.ts`
2. Set `isOpeningBalance: true` on opening balance transactions in `useFinanceData.ts` (addSubAccount)
3. Filter `isOpeningBalance` transactions out of income totals and breakdown in `Reports.tsx`
4. Update transfer dialog in `Accounts.tsx` to flatten accounts+subaccounts into a combined list for From/To dropdowns
5. Add `pb-24` to sub-account detail/history view in `Accounts.tsx`
6. Expand Next Period Planning form in `Settings.tsx` to include category allocation inputs with running total and save into `nextPeriodDraft.customCategories`
7. Fix `getNextDue` in `Recurring.tsx` — return `startDate` when `lastGenerated` is null
8. Apply `salaryRatio` to `monthly` in Subcategory Breakdown in `Projections.tsx`
9. Improve Scenario Sliders UI in `Projections.tsx` — subtitle, descriptions, base value reference, reset button
10. Build Calculator component and wire into amount field in `AddTransaction.tsx`
11. Add Split Expense toggle in `AddTransaction.tsx` — split amount input, auto-IOU on submit
12. Add Update App button in `Settings.tsx` — Service Worker registration check, skipWaiting, reload
13. Add Help / User Manual section in `Settings.tsx` — tabbed device guides (Android/iPhone/Desktop), feature overview, EN/Tagalog
