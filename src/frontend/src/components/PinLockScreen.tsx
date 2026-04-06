import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Delete, Leaf, ShieldAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface PinLockScreenProps {
  onUnlock: () => void;
}

async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(pin),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function PinLockScreen({ onUnlock }: PinLockScreenProps) {
  const [digits, setDigits] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [showWipeDialog, setShowWipeDialog] = useState(false);
  const isChecking = useRef(false);

  const MAX_DIGITS = 6;

  useEffect(() => {
    if (digits.length === MAX_DIGITS && !isChecking.current) {
      isChecking.current = true;
      const storedHash = localStorage.getItem("sft_pin_hash");
      if (!storedHash) {
        onUnlock();
        return;
      }
      hashPin(digits).then((hash) => {
        if (hash === storedHash) {
          onUnlock();
        } else {
          setShake(true);
          setError("Incorrect PIN");
          setTimeout(() => {
            setDigits("");
            setShake(false);
            setError(null);
            isChecking.current = false;
          }, 1200);
        }
      });
    }
  }, [digits, onUnlock]);

  const handleDigit = (d: string) => {
    if (digits.length < MAX_DIGITS && !isChecking.current) {
      setDigits((prev) => prev + d);
    }
  };

  const handleBackspace = () => {
    if (!isChecking.current) {
      setDigits((prev) => prev.slice(0, -1));
    }
  };

  const handleWipeAll = () => {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("sft_"));
    for (const k of keys) {
      localStorage.removeItem(k);
    }
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-background px-6 py-10">
      {/* Top: Logo + App Name */}
      <div className="flex flex-col items-center gap-2 mt-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "oklch(var(--primary))" }}
        >
          <Leaf size={28} className="text-primary-foreground" />
        </div>
        <span className="text-xl font-bold text-foreground mt-1">
          Flow Tracker
        </span>
      </div>

      {/* Middle: PIN Entry */}
      <div className="flex flex-col items-center gap-6 w-full max-w-xs">
        <p className="text-sm font-medium text-muted-foreground">
          Enter your PIN
        </p>

        {/* Dot indicators */}
        <AnimatePresence mode="wait">
          <motion.div
            key={shake ? "shake" : "normal"}
            animate={
              shake
                ? {
                    x: [-8, 8, -8, 8, -4, 4, 0],
                    transition: { duration: 0.4 },
                  }
                : { x: 0 }
            }
            className="flex items-center gap-4"
            data-ocid="pin_lock.dots"
          >
            {Array.from({ length: MAX_DIGITS }).map((_, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: positional dots
                key={i}
                className="w-4 h-4 rounded-full border-2 transition-all duration-150"
                style={{
                  backgroundColor:
                    i < digits.length ? "oklch(var(--primary))" : "transparent",
                  borderColor:
                    i < digits.length
                      ? "oklch(var(--primary))"
                      : "oklch(var(--border))",
                }}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Error message */}
        <div className="h-5">
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-destructive flex items-center gap-1.5"
              data-ocid="pin_lock.error_state"
            >
              <ShieldAlert size={13} />
              {error}
            </motion.p>
          )}
        </div>

        {/* Numpad */}
        <div
          className="grid grid-cols-3 gap-4 w-full"
          data-ocid="pin_lock.keypad"
        >
          {/* 1, 2, 3 */}
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="h-14 rounded-2xl text-xl font-semibold text-foreground transition-all active:scale-95"
              style={{ backgroundColor: "oklch(var(--secondary))" }}
              data-ocid={`pin_lock.digit_${d}_button`}
            >
              {d}
            </button>
          ))}
          {/* Bottom row: empty, 0, backspace */}
          <div className="h-14" />
          <button
            key="0"
            type="button"
            onClick={() => handleDigit("0")}
            className="h-14 rounded-2xl text-xl font-semibold text-foreground transition-all active:scale-95"
            style={{ backgroundColor: "oklch(var(--secondary))" }}
            data-ocid="pin_lock.digit_0_button"
          >
            0
          </button>
          <button
            key="backspace"
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl flex items-center justify-center text-foreground transition-all active:scale-95"
            style={{ backgroundColor: "oklch(var(--secondary))" }}
            aria-label="Backspace"
            data-ocid="pin_lock.backspace_button"
          >
            <Delete size={20} />
          </button>
        </div>
      </div>

      {/* Bottom: Forgot PIN */}
      <button
        type="button"
        className="text-xs text-muted-foreground underline underline-offset-4 pb-2"
        onClick={() => setShowWipeDialog(true)}
        data-ocid="pin_lock.forgot_pin_button"
      >
        Forgot PIN?
      </button>

      {/* Wipe All Data AlertDialog */}
      <AlertDialog open={showWipeDialog} onOpenChange={setShowWipeDialog}>
        <AlertDialogContent data-ocid="pin_lock.wipe_dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Wipe All Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>ALL your data</strong>. There
              is no recovery — make sure you have a JSON backup before
              proceeding. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="pin_lock.wipe_cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWipeAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="pin_lock.wipe_confirm_button"
            >
              Wipe Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
