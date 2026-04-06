# Flow Tracker

## Current State

Flow Tracker is a mobile-first, offline-first PWA for personal finance tracking (localStorage only, no backend). Current version (v27/mainnet) includes:
- Multi-account support (cash, bank, ewallet, credit) with transaction history per account
- Budget categories with global %/₱ toggle, subcategory ₱ inputs
- Financial goals with "already saved" baseline, account picker, date field, delta-based edits
- Bill Tracker nested in Accounts (add/edit/delete, due dates, mark paid/unpaid)
- IOU Tracker nested in Accounts (lent/borrowed flows)
- Data backup/restore (JSON export/import)
- Excess-to-savings prompt at period end
- User guide ("?" icon per section, EN/Tagalog)
- PWA/offline support via Service Worker
- Collapsible sections with persisted state
- Onboarding with category/account setup and custom period dates
- Reports, History, Projections, Recurring tabs

Key type definitions:
- `Account`: id, name, type, balance, creditLimit, apr, dueDate, color — NO subAccounts field yet
- `Config`: salary, period, customStartDate, customEndDate — NO periodMode field yet
- `Transaction`: id, amount, date, mainCategory, subCategory, description, type, account
- `Goal`: id, subCategoryId, targetAmount, currentSaved, alreadySavedAccountId, startDate
- `Bill`: id, name, amount, dueDayOfMonth, isPaidThisPeriod, notes
- localStorage keys: sft_config, sft_transactions, sft_periods, sft_recurring, sft_accounts, sft_goals
- NO sft_notes, NO sft_next_period_draft keys yet

## Requested Changes (Diff)

### Add

1. **Sub-accounts** — Each `Account` can have optional sub-accounts. Each sub-account has its own balance, name, opening balance with date. Sub-account balances roll up to the parent account total. All transaction types (Income, Expense, Transfer, Save to Goal) show sub-accounts in the account picker (displayed as "OwnBank > Parked Funds"). Account history view works at both parent and sub-account level. In the Accounts list, sub-accounts show as indented items under the parent, collapsed by default, expandable. Net worth uses parent account totals (which already include sub-account balances).

2. **Notes** — A new section (accessible from bottom nav or within a tab) where users can create free-form notes with optional checklist items. Each note has: title (optional), free-form text body (optional), optional checklist (add/check/uncheck/delete items), optional color tag for visual organization. Notes are searchable by title or content. Full add/edit/delete support.

3. **Onboarding introduction screen** — A new first screen shown ONLY on first launch (before existing onboarding). Shows plain-language explanation of what Flow Tracker is, what it does, and why it's useful. Displayed in both English and Tagalog matching the app language. Three key questions format: "Saan napunta ang pera ko?", "Magkano pa ang natitira?", "Kailan ko maaabot ang goal ko?". Has a "Get Started" / "Magsimula" button that proceeds to existing onboarding. Never shown again once dismissed (tracked in localStorage).

4. **Next Period Planning** — In Settings > Period Management, add a "Plan Next Period" button. Opens a form to set: start date, end date, expected income, and budget allocations for the upcoming period. Saved as a draft (sft_next_period_draft in localStorage). Zero impact on current period data. When current period ends (or user chooses to switch), an "Activate" button appears to apply the draft as the new active period. Draft can be edited or discarded at any time.

5. **Period Mode vs Monthly Mode** — Add a `periodMode: 'period' | 'monthly'` field to Config. During onboarding (new screen before period setup), user selects their preferred mode. Also switchable in Settings at any time.
   - **Period mode** (default/current behavior): custom start/end dates, manual period management
   - **Monthly mode**: budget resets automatically on the 1st of each calendar month; no manual period management needed; Dashboard shows monthly totals instead of period totals; no period-end prompts
   Existing users without this field default to 'period' mode to preserve their setup.

### Modify

- `types/index.ts`: Add `SubAccount` interface and `subAccounts?: SubAccount[]` to `Account`. Add `Note` and `ChecklistItem` interfaces. Add `periodMode?: 'period' | 'monthly'` to `Config`. Add `NextPeriodDraft` interface.
- `useFinanceData.ts`: Add state/handlers for notes (sft_notes), sub-accounts (embedded in sft_accounts as part of Account), next period draft (sft_next_period_draft), period mode logic. Update account balance calculations to include sub-account balances. Update transaction account picker to support sub-account selection.
- `Accounts.tsx`: Show sub-accounts as indented list under parent, collapsible. Add sub-account creation/edit/delete UI. Account history view filters by sub-account if one is selected.
- `AddTransaction.tsx`: Account picker shows parent accounts AND sub-accounts (formatted as "Parent > Sub").
- `Settings.tsx`: Add period mode toggle (Period/Monthly). Add "Plan Next Period" button and draft period form in Period Management section.
- `Onboarding.tsx`: Add intro screen as first step (shown only once). Add period mode selection step.
- `BottomNav.tsx`: Add Notes tab (replacing or adding to existing tabs, max 6).
- `i18n/translations.ts`: Add translation keys for all new features.
- `App.tsx`: Add Notes page route/tab.

### Remove

- Nothing removed.

## Implementation Plan

1. **Types** — Update `types/index.ts` with SubAccount, Note, ChecklistItem, NextPeriodDraft interfaces and update Account/Config.

2. **Data layer** — Update `useFinanceData.ts`:
   - Add notes state (sft_notes)
   - Add next period draft state (sft_next_period_draft)
   - Add periodMode logic (monthly mode auto-resets on 1st of month)
   - Update account handlers to support sub-accounts (add, edit, delete sub-account, opening balance logic)
   - Update net worth calculation to use parent balance (which should sum sub-account balances)
   - Update account picker data to expose sub-account options

3. **Sub-accounts UI** — Update `Accounts.tsx`:
   - Indented sub-account rows under parent with expand/collapse
   - Add/edit/delete sub-account sheet/dialog
   - Opening balance field with date picker on creation
   - Sub-account history view (filtered transactions)

4. **Notes page** — Create `src/frontend/src/pages/Notes.tsx`:
   - List of notes with title, color tag, preview text, checklist progress
   - Search bar
   - Add/edit note sheet with title, color picker, free-form textarea, checklist section
   - Check/uncheck individual checklist items inline

5. **Transaction account picker** — Update `AddTransaction.tsx` to show sub-accounts as selectable options formatted "Parent > Sub".

6. **Onboarding intro screen** — Update `Onboarding.tsx` to show intro as step 0 (one-time, tracked via sft_intro_seen in localStorage). Add period mode selection step.

7. **Next Period Planning** — Update `Settings.tsx` Period Management section with Plan Next Period button and draft form.

8. **Period Mode toggle** — Add to Settings and handle monthly mode logic in Dashboard/Reports.

9. **Navigation** — Update `BottomNav.tsx` and `App.tsx` to include Notes tab.

10. **Translations** — Add all new keys to `i18n/translations.ts` in both EN and Tagalog.

11. **Data migration** — Ensure existing users without new fields get safe defaults on load.
