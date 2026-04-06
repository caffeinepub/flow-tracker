import { Camera, FolderOpen, ImagePlus, Loader2, Lock, X } from "lucide-react";
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
  // Strip time portions like ", 09:31 AM" or " 09:31" before matching dates
  const cleaned = text.replace(
    /[,\s]+\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?/gi,
    " ",
  );

  // ── Dash-separated formats ────────────────────────────────────────────────

  // MM-DD-YYYY or DD-MM-YYYY (4-digit year)
  const dashFullMatch = cleaned.match(
    /\b(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01])-(20[0-9]{2})\b/,
  );
  if (dashFullMatch) {
    const [, m, d, y] = dashFullMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // MM-DD-YY (2-digit year, e.g. 04-06-26)
  const dashShortMatch = cleaned.match(
    /\b(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01])-(\d{2})\b/,
  );
  if (dashShortMatch) {
    const [, m, d, yy] = dashShortMatch;
    const fullYear = `20${yy}`;
    return `${fullYear}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // ── Slash-separated formats ───────────────────────────────────────────────

  // MM/DD/YYYY
  const slashMatch = cleaned.match(
    /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(20[0-9]{2})\b/,
  );
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // MM/DD/YY (2-digit year)
  const slashShortMatch = cleaned.match(
    /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(\d{2})\b/,
  );
  if (slashShortMatch) {
    const [, m, d, yy] = slashShortMatch;
    return `20${yy}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // ── ISO format YYYY-MM-DD ─────────────────────────────────────────────────
  const isoMatch = cleaned.match(
    /\b(20[0-9]{2})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])\b/,
  );
  if (isoMatch) {
    return isoMatch[0];
  }

  // ── Written month formats (e.g. April 6, 2026 / 06 Apr 2026) ─────────────
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

  // Month DD, YYYY or Month DD YYYY
  const longMatch = cleaned.match(
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

  // DD Month YYYY (e.g. 06 Apr 2026)
  const dmyMatch = cleaned.match(
    new RegExp(
      `\\b(0?[1-9]|[12][0-9]|3[01])\\s+(${monthNames})\\s+(20[0-9]{2})\\b`,
      "i",
    ),
  );
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const mon = months[dmyMatch[2].toLowerCase()];
    const yr = dmyMatch[3];
    return `${yr}-${mon}-${day}`;
  }

  return "";
}

function parseMerchant(text: string): string {
  const lines = text.split("\n").map((l) => l.trim());

  // Filter lines that are meaningful (not pure numbers/symbols/whitespace, min 3 chars)
  const isAddressOrPhone = (l: string) =>
    /^\+?\d[\d\s\-().]+$/.test(l) || // purely numeric/phone line
    /^(tel|fax|phone|mobile|email|www\.|http)/i.test(l) || // contact info prefix
    /^\d+\s+(st\.|ave\.|blvd\.|road|street|floor|bldg|building|unit|lot|block)/i.test(
      l,
    ); // number + street keyword

  const meaningfulLines = lines.filter(
    (l) =>
      l.length >= 3 &&
      !/^[0-9\s\W]+$/.test(l) && // skip lines that are only numbers/symbols
      !isAddressOrPhone(l),
  );

  if (meaningfulLines.length === 0) return "";

  // Take the first meaningful line as the merchant name
  // (receipts always print store name at the very top)
  const candidate = meaningfulLines[0].trim();
  return candidate.slice(0, 50);
}

async function runOCR(
  file: File,
  onScanComplete: (result: ReceiptScanResult) => void,
) {
  // Load Tesseract.js from CDN for offline-first PWA compatibility
  const w = window as unknown as {
    Tesseract?: { createWorker: (...args: any[]) => any };
  };
  const Tesseract = await (w.Tesseract
    ? Promise.resolve(w.Tesseract)
    : new Promise<any>((resolve, reject) => {
        if (document.querySelector("script[data-tesseract]")) {
          // Already loading — wait for it
          const interval = setInterval(() => {
            if (w.Tesseract) {
              clearInterval(interval);
              resolve(w.Tesseract);
            }
          }, 100);
          return;
        }
        const script = document.createElement("script");
        script.setAttribute("data-tesseract", "1");
        script.src =
          "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
        script.onload = () => resolve(w.Tesseract);
        script.onerror = reject;
        document.head.appendChild(script);
      }));
  const { createWorker } = Tesseract;
  const worker = await createWorker("eng");

  const {
    data: { text },
  } = await worker.recognize(file);

  await worker.terminate();

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
}

// ── Component ────────────────────────────────────────────────────────────────

export function ReceiptScanner({ onScanComplete }: ReceiptScannerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so the same file can be selected again
    if (e.target === cameraInputRef.current && cameraInputRef.current)
      cameraInputRef.current.value = "";
    if (e.target === galleryInputRef.current && galleryInputRef.current)
      galleryInputRef.current.value = "";
    if (!file) return;

    setShowMenu(false);
    setProcessing(true);

    try {
      await runOCR(file, onScanComplete);
    } catch (_err) {
      toast.error("OCR failed. Please fill in the form manually.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      {/* Hidden camera input (capture=environment = rear camera) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        data-ocid="receipt_scanner.camera_input"
      />

      {/* Hidden gallery/file input (no capture attribute = opens gallery/file picker) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        data-ocid="receipt_scanner.gallery_input"
      />

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setShowMenu(true)}
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

      {/* Source picker bottom sheet */}
      {showMenu && !processing && (
        <div
          className="fixed inset-0 z-[9998] flex flex-col justify-end"
          style={{ backgroundColor: "oklch(var(--background) / 0.7)" }}
          onClick={() => setShowMenu(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowMenu(false)}
          role="presentation"
          data-ocid="receipt_scanner.menu_overlay"
        >
          <div
            className="rounded-t-2xl border-t border-border pb-safe p-4 space-y-2"
            style={{ backgroundColor: "oklch(var(--card))" }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Scan Receipt
                </p>
                <p className="text-xs text-muted-foreground">
                  Choose image source
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "oklch(var(--muted))" }}
                aria-label="Close"
              >
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>

            {/* Camera option */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors active:scale-[0.98] text-left"
              style={{ backgroundColor: "oklch(var(--secondary))" }}
              data-ocid="receipt_scanner.use_camera"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "oklch(var(--primary) / 0.15)" }}
              >
                <Camera size={18} style={{ color: "oklch(var(--primary))" }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Take Photo
                </p>
                <p className="text-xs text-muted-foreground">
                  Use camera to capture receipt
                </p>
              </div>
            </button>

            {/* Gallery option */}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors active:scale-[0.98] text-left"
              style={{ backgroundColor: "oklch(var(--secondary))" }}
              data-ocid="receipt_scanner.use_gallery"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "oklch(var(--primary) / 0.15)" }}
              >
                <ImagePlus
                  size={18}
                  style={{ color: "oklch(var(--primary))" }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Choose from Gallery
                </p>
                <p className="text-xs text-muted-foreground">
                  Select an existing photo from your phone
                </p>
              </div>
            </button>

            {/* Privacy note */}
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 mt-1"
              style={{ backgroundColor: "oklch(var(--muted))" }}
            >
              <Lock size={11} style={{ color: "oklch(var(--primary))" }} />
              <p className="text-[11px] text-muted-foreground">
                Processing is done locally — photo never leaves your device
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Processing overlay */}
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
