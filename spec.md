# Flow Tracker

## Current State
Flow Tracker is a mobile-first offline PWA for personal finance tracking. The `AddTransaction` page (`src/frontend/src/pages/AddTransaction.tsx`) is the primary transaction entry screen. It already has a built-in calculator (via `showCalc` state), split expense support, and full category/account selection. The page is accessed via a button elsewhere in the app (likely Dashboard or a FAB).

No receipt scanning capability exists. Tesseract.js is not currently installed.

## Requested Changes (Diff)

### Add
- **Receipt scanning button**: A camera icon button placed next to (or alongside) the existing "Add Transaction" trigger button. This could be a secondary icon button near the main + button.
- **ReceiptScanner component** (`src/frontend/src/components/ReceiptScanner.tsx`): Handles the full scan flow:
  - Opens device camera via `<input type="file" accept="image/*" capture="environment">` (native camera on mobile, file picker fallback on desktop)
  - Shows a "Processing..." overlay/spinner while Tesseract.js runs OCR in the browser
  - Parses OCR text to extract: total amount (looks for TOTAL/AMOUNT/lines with largest currency value), date, merchant name (first meaningful line)
  - Calls back with extracted `{ amount, date, description }` — never stores the image
  - Image is revoked/discarded immediately after OCR completes
- **Tesseract.js dependency**: Add `tesseract.js` to package.json
- **Pre-fill AddTransaction form**: When scan completes, open AddTransaction with pre-filled amount, date, description — but NOT auto-saved. User reviews and manually taps Save.

### Modify
- `AddTransaction.tsx`: Accept optional initial props (`initialAmount`, `initialDate`, `initialDescription`) so the form can be pre-filled from a scan result
- Wherever the "Add Transaction" button lives (Dashboard or App-level FAB), add the camera scan button adjacent to it

### Remove
- Nothing removed

## Implementation Plan
1. Install `tesseract.js` as a dependency in `src/frontend/package.json`
2. Create `src/frontend/src/components/ReceiptScanner.tsx`:
   - Hidden file input with `accept="image/*" capture="environment"`
   - On file select: show spinner overlay, load Tesseract worker, run OCR, parse result, revoke object URL, call onScanComplete callback
   - Parse logic: find lines matching currency patterns (₱, PHP, digits with decimals), look for TOTAL/SUBTOTAL/AMOUNT keywords, pick the largest or keyword-matched value as amount; extract date via regex; use first non-empty line as merchant name
3. Modify `AddTransaction.tsx` to accept `initialAmount?: string`, `initialDate?: string`, `initialDescription?: string` props and seed state from them on mount
4. In `App.tsx` (or wherever the add transaction flow is triggered), add a camera icon button that triggers ReceiptScanner; on scan complete, open AddTransaction with pre-filled values
5. Validate and build
