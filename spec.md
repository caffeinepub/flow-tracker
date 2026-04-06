# Flow Tracker

## Current State
Sub-accounts each maintain their own `balance` field. Parent account cards display only the parent's own `balance`. Net worth on the Accounts screen is calculated using `a.balance` for each account (non-credit accounts only), which does not include sub-account balances.

Sub-accounts are nested under parent accounts and only visible when the user expands the dropdown — they are NOT shown as separate cards.

## Requested Changes (Diff)

### Add
- A helper function `getAccountTotalBalance(acc: Account): number` that returns `acc.balance + sum of all acc.subAccounts[].balance`

### Modify
- **Accounts screen — parent account card balance display:** Replace `acc.balance` with `getAccountTotalBalance(acc)` for the displayed balance on each account card (all account types). For credit accounts, continue using the same logic but with the rolled-up total.
- **Accounts screen — net worth calculation:** `totalAssets` and `totalLiabilities` calculations should use `getAccountTotalBalance(acc)` instead of `acc.balance`.
- **Accounts screen — sub-account list when expanded:** Each sub-account still shows its own individual balance (no change here).
- Any other place in Accounts.tsx where `acc.balance` is used for display/summary purposes (e.g. transfer dropdowns showing account balance in parentheses, goal account selectors) should show rolled-up total.

### Remove
- Nothing removed.

## Implementation Plan
1. Add helper `getAccountTotalBalance(acc: Account): number` near the top of Accounts.tsx (or inline where used).
2. Replace all display-level `acc.balance` references in Accounts.tsx with `getAccountTotalBalance(acc)` — specifically:
   - Account card balance display
   - Net worth / totalAssets / totalLiabilities calculations
   - Transfer dialog account labels showing balance in parentheses
   - Any goal-linked account balance shown in parentheses in dropdowns
3. Keep sub-account individual balance display unchanged (sub.balance stays as-is).
4. Do NOT change how transactions debit/credit accounts — `acc.balance` and `sub.balance` storage is unchanged, only the display aggregation changes.
