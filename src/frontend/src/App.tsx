import { Toaster } from "@/components/ui/sonner";
import { Eye, EyeOff, Leaf, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BottomNav } from "./components/BottomNav";
import type { Tab } from "./components/BottomNav";
import { PinLockScreen } from "./components/PinLockScreen";
import { ReceiptScanner } from "./components/ReceiptScanner";
import type { ReceiptScanResult } from "./components/ReceiptScanner";
import { useFinanceData } from "./hooks/useFinanceData";
import { useTranslation } from "./hooks/useTranslation";
import { Accounts } from "./pages/Accounts";
import { AddTransaction } from "./pages/AddTransaction";
import { Dashboard } from "./pages/Dashboard";
import { History } from "./pages/History";
import { IntroScreen } from "./pages/IntroScreen";
import { Notes } from "./pages/Notes";
import { Onboarding } from "./pages/Onboarding";
import { Projections } from "./pages/Projections";
import { Settings } from "./pages/Settings";
import type { Config } from "./types";

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
const LAST_ACTIVITY_KEY = "sft_last_activity";

function hasPinSet(): boolean {
  try {
    return !!localStorage.getItem("sft_pin_hash");
  } catch {
    return false;
  }
}

export default function App() {
  const { config, setConfig, isOnboarded } = useFinanceData();
  const t = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  // Privacy mode — session only, always starts false
  const [privacyMode, setPrivacyMode] = useState(false);

  // Receipt scanner pre-fill state
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);

  // PIN lock state
  const [pinLocked, setPinLocked] = useState(() => hasPinSet());

  // Intro screen — shown only once, tracked by localStorage
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return !localStorage.getItem("sft_intro_seen");
    } catch {
      return false;
    }
  });

  // ── Inactivity / visibility-based PIN re-lock ────────────────────────────
  const lastUnlockTime = useRef<number>(Date.now());

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      try {
        sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      } catch {}
    };
    window.addEventListener("pointerdown", updateActivity, { passive: true });
    window.addEventListener("keydown", updateActivity, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", updateActivity);
      window.removeEventListener("keydown", updateActivity);
    };
  }, []);

  // Re-lock when tab becomes visible after inactivity
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && hasPinSet()) {
        let lastActivity: number;
        try {
          const stored = sessionStorage.getItem(LAST_ACTIVITY_KEY);
          lastActivity = stored ? Number(stored) : lastUnlockTime.current;
        } catch {
          lastActivity = lastUnlockTime.current;
        }
        const elapsed = Date.now() - lastActivity;
        if (elapsed > INACTIVITY_LIMIT_MS) {
          setPinLocked(true);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // ── Theme ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const isDark = config?.theme !== "light";
    document.documentElement.classList.toggle("dark", isDark);
  }, [config?.theme]);

  const handleOnboardingComplete = (newConfig: Config) => {
    setConfig(newConfig);
    document.documentElement.classList.toggle(
      "dark",
      newConfig.theme === "dark",
    );
  };

  const handleThemeToggle = () => {
    const newTheme = config?.theme === "dark" ? "light" : "dark";
    setConfig((prev) => (prev ? { ...prev, theme: newTheme } : prev));
  };

  const handleIntroComplete = () => {
    try {
      localStorage.setItem("sft_intro_seen", "1");
    } catch {}
    setShowIntro(false);
  };

  const handleUnlock = () => {
    lastUnlockTime.current = Date.now();
    try {
      sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    } catch {}
    setPinLocked(false);
  };

  // ── PIN lock screen — shown FIRST before everything ──────────────────────
  if (pinLocked) {
    const isDark = config?.theme !== "light";
    return (
      <div className={isDark ? "dark" : ""}>
        <div className="min-h-screen bg-background">
          <PinLockScreen onUnlock={handleUnlock} />
          <Toaster />
        </div>
      </div>
    );
  }

  // Detect browser language for intro screen
  const browserLang =
    navigator.language?.startsWith("fil") ||
    navigator.language?.startsWith("tl")
      ? "tl"
      : "en";
  const introLang = (config?.language ?? browserLang) as "en" | "tl";

  // Show intro for new users
  if (!isOnboarded && showIntro) {
    return (
      <div className="dark">
        <IntroScreen language={introLang} onGetStarted={handleIntroComplete} />
        <Toaster />
      </div>
    );
  }

  if (!isOnboarded) {
    return (
      <div className="dark">
        <Onboarding onComplete={handleOnboardingComplete} />
        <Toaster />
      </div>
    );
  }

  const isDark = config?.theme !== "light";

  const pageTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return t("dashboard");
      case "add":
        return t("addTransaction");
      case "accounts":
        return "Accounts";
      case "projections":
        return "Projections";
      case "history":
        return "History";
      case "notes":
        return "Notes";
      case "settings":
        return t("settings");
      default:
        return "Flow Tracker";
    }
  };

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen gradient-bg">
        <header
          className="sticky top-0 z-40 border-b border-border backdrop-blur-sm"
          style={{ backgroundColor: "oklch(var(--card) / 0.9)" }}
        >
          <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "oklch(var(--primary))" }}
              >
                <Leaf size={14} className="text-primary-foreground" />
              </div>
              <span className="font-bold text-sm text-foreground">
                Flow Tracker
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {config?.name}
              </span>
              {/* Privacy Mode Toggle */}
              <button
                type="button"
                onClick={() => setPrivacyMode((v) => !v)}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-all"
                style={{ backgroundColor: "oklch(var(--secondary))" }}
                aria-label={privacyMode ? "Show amounts" : "Hide amounts"}
                data-ocid="app.privacy_toggle"
              >
                {privacyMode ? (
                  <EyeOff size={14} className="text-foreground" />
                ) : (
                  <Eye size={14} className="text-foreground" />
                )}
              </button>
              {/* Theme Toggle */}
              <button
                type="button"
                onClick={handleThemeToggle}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-all"
                style={{ backgroundColor: "oklch(var(--secondary))" }}
                aria-label="Toggle theme"
                data-ocid="app.theme_toggle"
              >
                {isDark ? (
                  <Sun size={14} className="text-foreground" />
                ) : (
                  <Moon size={14} className="text-foreground" />
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="px-4 pt-4 pb-2 max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-foreground">{pageTitle()}</h1>
        </div>

        <main className="max-w-lg mx-auto">
          {activeTab === "dashboard" && (
            <Dashboard onNavigate={setActiveTab} privacyMode={privacyMode} />
          )}
          {activeTab === "add" && (
            <AddTransaction
              onDone={() => {
                setActiveTab("dashboard");
                setScanResult(null);
              }}
              initialAmount={scanResult?.amount}
              initialDate={scanResult?.date}
              initialDescription={scanResult?.description}
            />
          )}
          {activeTab === "accounts" && <Accounts privacyMode={privacyMode} />}
          {activeTab === "projections" && (
            <Projections privacyMode={privacyMode} />
          )}
          {activeTab === "history" && (
            <History onNavigate={setActiveTab} privacyMode={privacyMode} />
          )}
          {activeTab === "notes" && <Notes />}
          {activeTab === "settings" && <Settings />}
        </main>

        {/* Floating receipt scanner button — hidden while on the add tab */}
        {activeTab !== "add" && (
          <div
            className="fixed z-40"
            style={{ bottom: "72px", right: "calc(50% - 72px)" }}
          >
            <ReceiptScanner
              onScanComplete={(result) => {
                setScanResult(result);
                setActiveTab("add");
              }}
            />
          </div>
        )}

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        <Toaster />
      </div>
    </div>
  );
}
