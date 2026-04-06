import { Camera, Loader2, Lock } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export interface ReceiptScanResult {
  amount: string;
  date: string;
  description: string;
}

interface ReceiptScannerProps {
  onScanComplete: (result: ReceiptScanResult) => void;
}

// ── OCR text parsers ─────────────────────────────────────────────────────────

function parseAmount(text: string): string {
  const lines = text.split("\n");

  // Priority: look for TOTAL / GRAND TOTAL / SUBTOTAL / AMOUNT lines first
  const totalKeywords =
    /\b(grand\s*total|total\s*amount|total|subtotal|amount\s*due|amount)\b/i;
  for (const line of lines) {
    if (totalKeywords.test(line)) {
      // Extract currency number from this line
      const match = line.match(
        /[₱P]?\s*([0-9]{1,3}(?:[,][0-9]{3})*(?:\.[0-9]{1,2})|[0-9]+(?:\.[0-9]{1,2}))/,
      );
      if (match) {
        const clean = match[1].replace(/,/g, "");
        const num = Number.parseFloat(clean);
        if (num > 0) return num.toFixed(2);
      }
    }
  }

  // Fallback: find the largest currency-formatted number in the whole text
  const allMatches = text.matchAll(
    /[₱P]?\s*([0-9]{1,3}(?:[,][0-9]{3})*(?:\.[0-9]{2})|[0-9]{2,}(?:\.[0-9]{2}))/g,
  );
  let largest = 0;
  for (const m of allMatches) {
    const clean = m[1].replace(/,/g, "");
    const num = Number.parseFloat(clean);
    if (num > largest) largest = num;
  }
  if (largest > 0) return largest.toFixed(2);

  return "";
}

function parseDate(text: string): string {
  // MM/DD/YYYY or DD/MM/YYYY
  const slashMatch = text.match(
    /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(20[0-9]{2})\b/,
  );
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // YYYY-MM-DD
  const isoMatch = text.match(
    /\b(20[0-9]{2})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])\b/,
  );
  if (isoMatch) {
    return isoMatch[0];
  }

  // Month DD, YYYY or Month DD YYYY
  const months: Record<string, string> = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const monthNames = Object.keys(months).join("|");
  const longMatch = text.match(
    new RegExp(
      `\\b(${monthNames})\\s+(0?[1-9]|[12][0-9]|3[01])[,\\s]+(20[0-9]{2})\\b`,
      "i",
    ),
  );
  if (longMatch) {
    const mon = months[longMatch[1].toLowerCase()];
    const day = longMatch[2].padStart(2, "0");
    const yr = longMatch[3];
    return `${yr}-${mon}-${day}`;
  }

  return "";
}

function parseMerchant(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && !/^[0-9\s\W]+$/.test(l)); // skip lines that are only numbers/symbols

  if (lines.length === 0) return "";

  // Take first 1-2 meaningful lines, join them, trim to 50 chars
  const candidate = lines.slice(0, 2).join(" ").trim();
  return candidate.slice(0, 50);
}

// ── Component ────────────────────────────────────────────────────────────────

export function ReceiptScanner({ onScanComplete }: ReceiptScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    // Reset input so the same file can be re-selected
    fileInputRef.current.value = "";
    if (!file) return;

    setProcessing(true);

    try {
      // Dynamically import tesseract to avoid bloating initial bundle
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");

      const {
        data: { text },
      } = await worker.recognize(file);

      await worker.terminate();

      // Image is a File object — no object URL was created, so nothing to revoke.
      // The `file` reference will be GC'd normally.

      const amount = parseAmount(text);
      const date = parseDate(text);
      const description = parseMerchant(text);

      onScanComplete({ amount, date, description });

      if (!amount && !date && !description) {
        toast.warning(
          "Receipt scanned but no data could be extracted. Please fill in manually.",
        );
      } else {
        toast.success("Receipt scanned! Review the pre-filled form.");
      }
    } catch (_err) {
      toast.error("OCR failed. Please fill in the form manually.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      {/* Hidden file input — capture="environment" opens rear camera on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        data-ocid="receipt_scanner.upload_button"
      />

      {/* Camera trigger button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={processing}
        aria-label="Scan receipt"
        className="flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 shadow-md"
        style={{
          backgroundColor: "oklch(var(--secondary))",
          border: "1.5px solid oklch(var(--border))",
        }}
        data-ocid="receipt_scanner.button"
      >
        <Camera size={18} className="text-foreground" />
      </button>

      {/* Full-screen processing overlay */}
      {processing && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center gap-4 z-[9999]"
          style={{ backgroundColor: "oklch(var(--background) / 0.92)" }}
          data-ocid="receipt_scanner.loading_state"
        >
          <div
            className="rounded-2xl p-6 flex flex-col items-center gap-4 max-w-xs w-full mx-4 shadow-xl border border-border"
            style={{ backgroundColor: "oklch(var(--card))" }}
          >
            <Loader2
              size={40}
              className="animate-spin"
              style={{ color: "oklch(var(--primary))" }}
            />
            <p className="text-sm font-semibold text-foreground text-center">
              Processing receipt...
            </p>
            <p className="text-xs text-muted-foreground text-center">
              This may take a few seconds
            </p>
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 w-full"
              style={{ backgroundColor: "oklch(var(--secondary))" }}
            >
              <Lock size={12} style={{ color: "oklch(var(--primary))" }} />
              <p className="text-[11px] text-muted-foreground">
                Processing locally — image never leaves your device
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
