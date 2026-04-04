# Flow Tracker — Version 20

## Current State

Flow Tracker is a mobile-first offline-first PWA for personal finance tracking. All data is stored in localStorage. The app has the following pages: Dashboard, Accounts, Add Transaction, History, Reports, Projections, Recurring, Settings, Onboarding.

Key current state:
- Categories Settings has a global ₱/% toggle at the top header. When toggled to ₱ mode, subcategory amount inputs exist but have a critical bug: amounts are back-calculated to % via `Math.round((enteredAmt / catAmount) * 100)`, causing rounding loss. Validation then checks if `subTotal === 100` (strict equality) which fails even for exact amounts (e.g. 700+400+1000=2300 on a 2300 budget shows 99% due to rounding). The Save button is blocked with "fix subcategories" when this check fails.
- Settings > Period Management shows a Custom End Date input when period type is "custom", but there is NO Custom Start Date input.
- Dashboard, Accounts, Projections have no collapsible sections. All sections always expand fully.
- IOU and History sections in Accounts page are always fully visible.

## Requested Changes (Diff)

### Add
- **Collapsible sections on Dashboard**: Each section (Period Summary, Category Spending, Goal Progress Cards, CC Alerts if present) should have a collapse/expand toggle. Collapsed state persists in localStorage under key `dashboard_collapsed_sections`.
- **Collapsible sections on Accounts page**: The accounts list, IOU section, and History section should each be individually collapsible. The Net Worth summary card stays always visible. Collapsed state persists in localStorage under key `accounts_collapsed_sections`.
- **Collapsible sections on Projections page**: The projections chart/sliders section and the Financial Goals section should each be individually collapsible. Collapsed state persists in localStorage under key `projections_collapsed_sections`.
- **Custom Start Date in Settings > Period Management**: When period type is "custom", show both a start date input AND an end date input. Currently only end date is shown. The start date should update `config.customStartDate` (already defined in Config type). This also means when starting a new period with custom type, the new period uses the user's chosen start date.

### Modify
- **Subcategory ₱ validation — fix rounding bug and change from blocking to warning-only**:
  - Root cause: In ₱ mode, subcategory amounts are back-calculated to `pct` via `Math.round()` which causes rounding loss. Then strict `subTotal === 100` check fails.
  - Fix: In ₱ mode, store subcategory amounts directly (either as a separate `amountValue` field in the state, or by NOT converting to pct during input, but computing pct only when saving). Validation should use the raw amounts and check if `sum of subcategory amounts ≈ parent category amount` (within ₱1 tolerance), not rely on pct rounding.
  - Change behavior: In ₱ mode, the sub-allocation check should be a **warning only** (show orange/red indicator) but NOT block saving. Remove the blocking `canSave` dependency on `isValidSubAllocation` in ₱ mode. The button should always allow saving in ₱ mode, only warn.
  - In % mode, keep the existing strict 100% requirement (blocking).
  - The "Subs: X% (must be 100%)" badge shown per-category in ₱ mode should be updated to show the peso total vs parent budget: e.g. "Subs: ₱2,300 / ₱2,300 ✓" or "Subs: ₱2,100 / ₱2,300 ⚠ ₱200 unallocated".

### Remove
- Nothing to remove.

## Implementation Plan

1. **Fix subcategory ₱ validation** (Settings.tsx):
   - Track subcategory amounts in a separate `subAmountInputs` state (keyed by sub.id → string) — this already exists.
   - In `handleSave`, when in ₱ mode: do NOT block if sub amounts don't perfectly sum to parent; just proceed. Remove the `isValidSubAllocation` blocking check when `globalAllocMode === "amount"`.
   - Update the per-category sub badge to show ₱ totals vs parent budget in ₱ mode.
   - Update `canSave` to: `isValidAllocation && (globalAllocMode === 'amount' ? true : isValidSubAllocation)` — i.e. only block on sub % validation in % mode.
   - When saving in ₱ mode, convert sub amounts to pct using the actual ratio (not rounded): store the exact pct (can be float) OR keep amounts and compute display from amounts. Simplest: save pct as float (not rounded) so that 700/2300 = 30.43..%, and the sum check uses sum of amounts not sum of pcts.

2. **Add Custom Start Date in Settings** (Settings.tsx):
   - Below the existing "Custom End Date" input, add a "Custom Start Date" input that sets `config.customStartDate`.
   - Show it only when `config.period === "custom"`.
   - Both inputs should be side-by-side on the same row if space allows, or stacked.

3. **Collapsible sections — Dashboard** (Dashboard.tsx):
   - Load collapsed state from localStorage key `dashboard_collapsed_sections` (default: all expanded).
   - Add collapse toggle buttons (chevron icon) to each section header: Period Summary, Category Spending, Goal Progress, CC Alerts.
   - Save to localStorage on toggle.

4. **Collapsible sections — Accounts** (Accounts.tsx):
   - Load collapsed state from localStorage key `accounts_collapsed_sections`.
   - Net Worth card: always visible.
   - Add collapse toggles to: Accounts List section header, IOU section header, History section header.
   - Save to localStorage on toggle.

5. **Collapsible sections — Projections** (Projections.tsx):
   - Load collapsed state from localStorage key `projections_collapsed_sections`.
   - Add collapse toggles to: Projections chart/sliders section header, Financial Goals section header.
   - Save to localStorage on toggle.
