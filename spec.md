# Flow Tracker

## Current State
Flow Tracker is a mobile-first, offline-first PWA personal finance tracker. All data is stored in localStorage. There is no backend. App.tsx manages top-level routing between tabs. Settings.tsx has a Data Backup section with Export/Import buttons. Reports.tsx has a Summary section showing income totals using `ytdData.incomeTotal` which already filters `!t.isOpeningBalance` in the current code. However, opening balance transactions created before the flag was introduced may not have `isOpeningBalance: true` set, causing them to appear as income in the Summary.

## Requested Changes (Diff)

### Add
- **Privacy Mode**: A toggle button in the app header (eye/eye-off icon) that blurs sensitive financial values across the entire app. Blurred elements: account balances, net worth, transaction amounts in History, goal amounts in Projections, budget amounts on Dashboard. Defaults to UNBLURRED (privacyMode = false) every time the app opens -- it is session-only state (not persisted). When blurred, show `••••••` instead of amounts, or apply `blur-sm select-none` CSS class.
- **PIN Lock**: A 6-digit PIN system stored in localStorage (key: `sft_pin_hash` using SHA-256 hash). Behavior:
  - If PIN is set, show a PIN entry screen on app load BEFORE showing anything else (before intro screen, before onboarding, before main app)
  - Also lock after 5 minutes of inactivity (track last activity time; on focus/visibilitychange, check if elapsed > 5 min)
  - PIN entry screen: 6 large digit circles + numpad (0-9 + backspace + submit)
  - Forgot PIN option: shows a warning dialog saying "This will permanently delete ALL your app data. This cannot be undone. Make sure you have a JSON backup." with a red "Wipe Everything" confirm button. On confirm: clear ALL localStorage keys starting with `sft_` and reload the page.
  - PIN setup in Settings: under Security section, show "Set PIN" button if no PIN, or "Change PIN" and "Remove PIN" if PIN exists. Setting/changing PIN: enter new 6-digit PIN twice to confirm.
- **"Calculated locally" label**: In the Projections page footer, add a subtle line: "🔒 Calculated locally · Your data never leaves this device"

### Modify
- **JSON Export button visibility in Settings**: The Export Backup button in Settings > Data Backup section should be made highly visible -- use a prominent primary-colored button (full-width or large), possibly with a shield/download icon, and a note: "Export a backup before enabling PIN lock."
- **Reports > Summary > Income -- opening balance fix**: In `ytdData` computation in Reports.tsx, the filter `!t.isOpeningBalance` is present but doesn't catch OLD transactions that were created without the flag. Add a secondary check: also exclude transactions where `t.subCategory === 'Opening Balance'` OR `t.description?.includes('Opening Balance')`. This covers legacy transactions.

### Remove
- Nothing removed.

## Implementation Plan

1. **App.tsx -- PIN Lock gate**: Add `pinLocked` state. On mount, check if `sft_pin_hash` exists in localStorage. If yes, show `<PinLockScreen>` component. Track inactivity with `document.addEventListener('visibilitychange')` and a timestamp in sessionStorage. After 5 min inactivity, set `pinLocked = true`.

2. **PinLockScreen component** (`src/frontend/src/components/PinLockScreen.tsx`): Renders fullscreen PIN entry UI. 6 dot indicators, numpad grid. On submit, SHA-256 hash the entered PIN and compare to stored hash. On success, call `onUnlock()`. Show "Forgot PIN" link that opens AlertDialog warning about data wipe.

3. **Privacy Mode** -- Add `privacyMode` boolean state in App.tsx (default false, session-only). Pass it via context or prop drilling. Add eye/eye-off toggle button in the header next to theme toggle. Create a helper component `<PrivateAmount value={...} currency={...} privacyMode={...} />` or a utility function that returns `"••••••"` when privacy mode is on. Apply to Dashboard balances, Accounts balances/net worth, History transaction amounts, Projections goal amounts.

4. **Settings -- PIN management**: Add a Security section in Settings. Show current PIN status. Allow set/change/remove PIN. PIN setup flow: enter 6-digit PIN → confirm → hash with SHA-256 → store in `sft_pin_hash`.

5. **Settings -- Export button**: Make the Export Backup button in the Data Backup section large, full-width, with a distinct style (primary color or green). Add note text below it about exporting before enabling PIN.

6. **Projections footer**: Add "🔒 Calculated locally · Your data never leaves this device" as small muted text at the bottom of the Projections page.

7. **Reports.tsx -- income filter fix**: Change income filter from `!t.isOpeningBalance` to `!t.isOpeningBalance && t.subCategory !== 'Opening Balance' && !t.description?.includes('Opening Balance')` in both `incomeTotal` and `incomeBySource` computations.

### Key Files
- `src/frontend/src/App.tsx` -- PIN gate, privacy mode state, header toggle
- `src/frontend/src/components/PinLockScreen.tsx` -- new component
- `src/frontend/src/pages/Settings.tsx` -- PIN management section, export button styling
- `src/frontend/src/pages/Dashboard.tsx` -- privacy mode for balances
- `src/frontend/src/pages/Accounts.tsx` -- privacy mode for account balances
- `src/frontend/src/pages/History.tsx` -- privacy mode for transaction amounts
- `src/frontend/src/pages/Projections.tsx` -- privacy mode for goal amounts + footer label
- `src/frontend/src/pages/Reports.tsx` -- opening balance income filter fix
