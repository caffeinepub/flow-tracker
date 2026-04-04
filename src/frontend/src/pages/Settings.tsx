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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ChevronDown,
  ChevronUp,
  Database,
  Download,
  Moon,
  Plus,
  RefreshCw,
  RotateCcw,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { HelpSheet } from "../components/HelpSheet";
import {
  CURRENCIES,
  DEFAULT_CUSTOM_CATEGORIES,
  formatAmount,
} from "../data/categories";
import { useFinanceData } from "../hooks/useFinanceData";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useTranslation } from "../hooks/useTranslation";
import type {
  CustomCategory,
  CustomSubCategory,
  Language,
  Theme,
} from "../types";

const _ICON_OPTIONS = [
  "ShoppingCart",
  "Home",
  "Zap",
  "Car",
  "FileText",
  "Utensils",
  "Shirt",
  "Tv",
  "Heart",
  "Gamepad2",
  "Shield",
  "TrendingUp",
  "Target",
  "BarChart2",
  "Wallet",
  "Coffee",
  "Music",
  "Book",
  "Globe",
  "Tag",
];

export function Settings() {
  const t = useTranslation();
  const {
    config,
    setConfig,
    customCategories,
    startNewPeriod,
    resetAllData,
    exportData,
    importData,
    periods,
    currentPeriodEnd,
    incomeSourceChips,
    updateIncomeSourceChips,
  } = useFinanceData();
  const [lang, setLang] = useLocalStorage<Language>("sft_lang", "en");

  const [name, setName] = useState(config?.name ?? "");
  const [salary, setSalary] = useState(config?.salary?.toString() ?? "");
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmNewPeriod, setConfirmNewPeriod] = useState(false);
  const [mergeDeleteId, setMergeDeleteId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileRef = useRef<HTMLInputElement>(null);
  const [showBackupWarning, setShowBackupWarning] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<string | null>(
    null,
  );

  // Income source chips state
  const [newChip, setNewChip] = useState("");

  const [localCats, setLocalCats] = useState<CustomCategory[]>(
    () => customCategories,
  );

  // Global allocation mode — single toggle that applies to all categories
  const [globalAllocMode, setGlobalAllocMode] = useState<"pct" | "amount">(
    () => customCategories[0]?.allocationMode ?? "pct",
  );

  // Subcategory amount inputs — keyed by sub.id, holds the raw string the user typed
  const [subAmountInputs, setSubAmountInputs] = useState<
    Record<string, string>
  >({});

  const handleGlobalModeToggle = (mode: "pct" | "amount") => {
    setGlobalAllocMode(mode);
    if (mode === "amount") {
      // Pre-populate subAmountInputs — prefer stored amountValue over pct round-trip
      const newSubInputs: Record<string, string> = {};
      setLocalCats((prev) => {
        const updated = prev.map((c) => {
          const catAmt =
            c.allocationAmount != null
              ? c.allocationAmount
              : Math.round((currentSalary * c.pct) / 100);
          for (const sub of c.subCategories) {
            // Use stored amountValue as source of truth; fall back to pct-derived value
            const displayAmt =
              sub.amountValue != null
                ? sub.amountValue
                : Math.round((catAmt * (sub.pct ?? 0)) / 100);
            newSubInputs[sub.id] = String(displayAmt);
          }
          return {
            ...c,
            allocationMode: "amount" as const,
            allocationAmount:
              c.allocationAmount ?? Math.round((currentSalary * c.pct) / 100),
          };
        });
        return updated;
      });
      setSubAmountInputs(newSubInputs);
    } else {
      setSubAmountInputs({});
      setLocalCats((prev) =>
        prev.map((c) => ({
          ...c,
          allocationMode: "pct" as const,
          allocationAmount: undefined,
        })),
      );
    }
  };

  const currentSalary = Number.parseFloat(salary) || config?.salary || 23000;

  // Validate total allocation — respects allocationMode
  const _totalPct = localCats.reduce((s, c) => {
    if (c.allocationMode === "amount" && c.allocationAmount != null) {
      // In amount mode, auto-calc pct contribution
      return s + Math.round((c.allocationAmount / currentSalary) * 100);
    }
    return s + c.pct;
  }, 0);

  // For save validation, check if total % == 100 for pct-mode categories
  const pctOnlyCats = localCats.filter(
    (c) => c.allocationMode !== "amount" || c.allocationAmount == null,
  );
  const amountCats = localCats.filter(
    (c) => c.allocationMode === "amount" && c.allocationAmount != null,
  );
  const amountTotal = amountCats.reduce(
    (s, c) => s + (c.allocationAmount ?? 0),
    0,
  );
  const pctTotal = pctOnlyCats.reduce((s, c) => s + c.pct, 0);
  const effectivePctTotal =
    pctTotal + Math.round((amountTotal / currentSalary) * 100);
  const isValidAllocation = effectivePctTotal === 100;

  // Check if all sub-allocations are valid
  const invalidSubCats = localCats.filter((cat) => {
    if (cat.subCategories.length === 0) return false;
    const subTotal = cat.subCategories.reduce(
      (s, sub) => s + (sub.pct ?? 0),
      0,
    );
    return subTotal !== 100;
  });
  const isValidSubAllocation = invalidSubCats.length === 0;
  // In ₱ mode, subcategory amounts don't need to sum to 100% — just warn
  const canSave =
    isValidAllocation &&
    (globalAllocMode === "amount" ? true : isValidSubAllocation);

  const updateCat = (id: string, updates: Partial<CustomCategory>) => {
    setLocalCats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  };

  const updateSub = (
    catId: string,
    subId: string,
    updates: Partial<CustomSubCategory>,
  ) => {
    setLocalCats((prev) =>
      prev.map((c) =>
        c.id === catId
          ? {
              ...c,
              subCategories: c.subCategories.map((s) =>
                s.id === subId ? { ...s, ...updates } : s,
              ),
            }
          : c,
      ),
    );
  };

  const addSubToCategory = (catId: string) => {
    const newSub: CustomSubCategory = {
      id: crypto.randomUUID(),
      name: "New Sub",
      icon: "Tag",
      pct: 0,
    };
    setLocalCats((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, subCategories: [...c.subCategories, newSub] }
          : c,
      ),
    );
  };

  const removeSub = (catId: string, subId: string) => {
    setLocalCats((prev) =>
      prev.map((c) =>
        c.id === catId
          ? {
              ...c,
              subCategories: c.subCategories.filter((s) => s.id !== subId),
            }
          : c,
      ),
    );
  };

  const addCategory = () => {
    if (localCats.length >= 6) return;
    const newCat: CustomCategory = {
      id: crypto.randomUUID(),
      name: "New Category",
      color: `#${Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, "0")}`,
      pct: 0,
      subCategories: [],
    };
    setLocalCats((prev) => [...prev, newCat]);
  };

  const moveCat = (id: string, dir: -1 | 1) => {
    setLocalCats((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const requestDeleteCat = (id: string) => {
    if (localCats.length <= 2) {
      toast.error("You need at least 2 categories.");
      return;
    }
    setMergeDeleteId(id);
    const others = localCats.filter((c) => c.id !== id);
    setMergeTargetId(others[0]?.id ?? "");
  };

  const confirmDeleteCat = () => {
    if (!mergeDeleteId) return;
    // Redistribute pct
    const deletedCat = localCats.find((c) => c.id === mergeDeleteId);
    const target = localCats.find((c) => c.id === mergeTargetId);
    if (deletedCat && target) {
      updateCat(mergeTargetId, { pct: target.pct + deletedCat.pct });
    }
    setLocalCats((prev) => prev.filter((c) => c.id !== mergeDeleteId));
    setMergeDeleteId(null);
  };

  const handleSave = () => {
    if (!isValidAllocation) {
      toast.error("Allocations must sum to 100%");
      return;
    }
    // Validate sub-allocations only in % mode (in ₱ mode, just warn)
    if (globalAllocMode === "pct") {
      for (const cat of localCats) {
        if (cat.subCategories.length > 0) {
          const subTotal = cat.subCategories.reduce(
            (s, sub) => s + (sub.pct ?? 0),
            0,
          );
          if (subTotal !== 100) {
            toast.error(
              `${cat.name} subcategory allocations must sum to 100% (currently ${subTotal}%)`,
            );
            return;
          }
        }
      }
    }
    // Warn if any exact amounts exceed salary
    if (amountTotal > currentSalary) {
      toast.warning(
        `Total exact amounts (${formatAmount(amountTotal, config?.currency ?? "PHP")}) exceed your income (${formatAmount(currentSalary, config?.currency ?? "PHP")})`,
        { duration: 5000 },
      );
    }
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            name: name.trim() || prev.name,
            salary: Number.parseFloat(salary) || prev.salary,
            customCategories: localCats,
          }
        : prev,
    );
    toast.success("Settings saved!");
  };

  const handleThemeToggle = () => {
    const newTheme: Theme = config?.theme === "dark" ? "light" : "dark";
    setConfig((prev) => (prev ? { ...prev, theme: newTheme } : prev));
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const handleLangToggle = () => {
    const newLang: Language = lang === "en" ? "tl" : "en";
    setLang(newLang);
    setConfig((prev) => (prev ? { ...prev, language: newLang } : prev));
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const success = importData(result);
      toast[success ? "success" : "error"](
        success ? "Data imported!" : "Import failed",
      );
    };
    reader.readAsText(file);
  };

  const handleExportBackup = () => {
    const ALL_KEYS = [
      "sft_config",
      "sft_transactions",
      "sft_accounts",
      "sft_goals",
      "sft_ious",
      "sft_recurring",
      "sft_periods",
      "sft_projection_settings",
      "sft_bills",
      "sft_lang",
      "flow_accounts_sections",
      "flow_dashboard_sections",
      "flow_proj_sections",
    ];
    const data: Record<string, unknown> = {};
    for (const key of ALL_KEYS) {
      const val = localStorage.getItem(key);
      if (val !== null) {
        try {
          data[key] = JSON.parse(val);
        } catch {
          data[key] = val;
        }
      }
    }
    const backup = {
      version: "flow-tracker-v1",
      exportedAt: new Date().toISOString(),
      data,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `flow-tracker-backup-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exported successfully");
  };

  const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPendingRestoreFile(result);
      setShowBackupWarning(true);
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleConfirmRestore = () => {
    if (!pendingRestoreFile) return;
    try {
      const backup = JSON.parse(pendingRestoreFile);
      if (backup.version !== "flow-tracker-v1") {
        toast.error("Invalid backup file");
        return;
      }
      for (const [key, value] of Object.entries(backup.data)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
      toast.success("Data restored successfully. Reloading...");
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      toast.error("Invalid backup file");
    }
    setShowBackupWarning(false);
    setPendingRestoreFile(null);
  };

  const handleResetCategories = () => {
    setLocalCats(DEFAULT_CUSTOM_CATEGORIES);
    toast.success("Categories reset to defaults");
  };

  const handleAddChip = () => {
    const chip = newChip.trim();
    if (!chip) return;
    if (incomeSourceChips.includes(chip)) {
      toast.error("Source already exists");
      return;
    }
    updateIncomeSourceChips([...incomeSourceChips, chip]);
    setNewChip("");
    toast.success(`\"${chip}\" added`);
  };

  const handleRemoveChip = (chip: string) => {
    updateIncomeSourceChips(incomeSourceChips.filter((c) => c !== chip));
  };

  const isDark = config?.theme !== "light";

  return (
    <div className="pb-24 px-4 pt-2 fade-in">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <HelpSheet section="settings" language={config?.language ?? "en"} />
      </div>
      {/* Profile */}
      <Section title={t("profile")}>
        <div className="space-y-3">
          <div>
            <Label htmlFor="sname">{t("name")}</Label>
            <Input
              id="sname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              data-ocid="settings.name.input"
            />
          </div>
          <div>
            <Label htmlFor="ssalary">{t("salary")}</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="ssalary"
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                data-ocid="settings.salary.input"
              />
              <select
                className="px-2 rounded-lg border border-border bg-card text-foreground text-sm"
                value={config?.currency ?? "PHP"}
                onChange={(e) =>
                  setConfig((prev) =>
                    prev ? { ...prev, currency: e.target.value } : prev,
                  )
                }
                data-ocid="settings.currency.select"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Section>

      {/* Income Sources */}
      <Section title="Income Sources">
        <p className="text-xs text-muted-foreground mb-3">
          Customize the source tags shown when adding income transactions.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {incomeSourceChips.map((chip) => (
            <div
              key={chip}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
              style={{
                backgroundColor: "oklch(var(--secondary))",
                borderColor: "oklch(var(--border))",
              }}
            >
              <span>{chip}</span>
              <button
                type="button"
                onClick={() => handleRemoveChip(chip)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                data-ocid="settings.income_source.delete_button"
                aria-label={`Remove ${chip}`}
              >
                <X size={10} />
              </button>
            </div>
          ))}
          {incomeSourceChips.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No sources. Add one below.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={newChip}
            onChange={(e) => setNewChip(e.target.value)}
            placeholder="e.g. Sideline, Pension"
            className="flex-1 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleAddChip()}
            data-ocid="settings.income_source.input"
          />
          <Button
            size="sm"
            onClick={handleAddChip}
            disabled={!newChip.trim()}
            style={{
              backgroundColor: "oklch(var(--primary))",
              color: "oklch(var(--primary-foreground))",
            }}
            data-ocid="settings.income_source.button"
          >
            <Plus size={14} /> Add
          </Button>
        </div>
      </Section>

      {/* Categories */}
      <Section title="Categories">
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div
                className="text-xs font-semibold px-2 py-1 rounded-full"
                style={{
                  backgroundColor: isValidAllocation
                    ? "#20D18A22"
                    : "#EB575722",
                  color: isValidAllocation ? "#20D18A" : "#EB5757",
                }}
              >
                Total: {effectivePctTotal}%{" "}
                {isValidAllocation ? "✓" : "(must be 100%)"}
              </div>
              {/* Global % / ₱ toggle */}
              <div
                className="flex rounded-lg overflow-hidden border"
                style={{ borderColor: "oklch(var(--border))" }}
              >
                <button
                  type="button"
                  onClick={() => handleGlobalModeToggle("pct")}
                  className="px-2.5 py-1 text-xs font-bold transition-all"
                  style={{
                    backgroundColor:
                      globalAllocMode === "pct"
                        ? "oklch(var(--foreground))"
                        : "transparent",
                    color:
                      globalAllocMode === "pct"
                        ? "oklch(var(--background))"
                        : "oklch(var(--muted-foreground))",
                  }}
                  data-ocid="settings.global_alloc.pct.toggle"
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => handleGlobalModeToggle("amount")}
                  className="px-2.5 py-1 text-xs font-bold transition-all"
                  style={{
                    backgroundColor:
                      globalAllocMode === "amount"
                        ? "oklch(var(--foreground))"
                        : "transparent",
                    color:
                      globalAllocMode === "amount"
                        ? "oklch(var(--background))"
                        : "oklch(var(--muted-foreground))",
                  }}
                  data-ocid="settings.global_alloc.amount.toggle"
                >
                  ₱
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleResetCategories}
                className="text-xs text-muted-foreground underline"
              >
                Reset defaults
              </button>
              <Button
                size="sm"
                variant="outline"
                onClick={addCategory}
                disabled={localCats.length >= 6}
                className="gap-1 text-xs h-7 px-2"
                data-ocid="settings.category.button"
              >
                <Plus size={12} /> Add
              </Button>
            </div>
          </div>

          {/* Running total warning for ₱ mode */}
          {globalAllocMode === "amount" && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                backgroundColor: isValidAllocation ? "#20D18A22" : "#EB575722",
                color: isValidAllocation ? "#20D18A" : "#EB5757",
              }}
            >
              Currently ₱
              {Math.round(
                amountTotal + (currentSalary * pctTotal) / 100,
              ).toLocaleString()}{" "}
              ({effectivePctTotal}%)
              {!isValidAllocation &&
                ` — ₱${Math.round(currentSalary - amountTotal - (currentSalary * pctTotal) / 100).toLocaleString()} (${100 - effectivePctTotal}%) remaining to allocate`}
              {isValidAllocation && " ✓"}
            </div>
          )}

          {localCats.map((cat, idx) => {
            const subTotal = cat.subCategories.reduce(
              (s, sub) => s + (sub.pct ?? 0),
              0,
            );
            const isSubValid =
              cat.subCategories.length === 0 || subTotal === 100;
            const isAmountMode = cat.allocationMode === "amount";
            // Derive cat amount from current salary or stored allocationAmount
            const catAmount =
              isAmountMode && cat.allocationAmount != null
                ? cat.allocationAmount
                : (currentSalary * cat.pct) / 100;
            const autoPct =
              isAmountMode && cat.allocationAmount != null
                ? Math.round((cat.allocationAmount / currentSalary) * 100)
                : cat.pct;

            // In ₱ mode, compute sub totals from subAmountInputs for per-cat warning
            const subAmountTotal =
              globalAllocMode === "amount"
                ? cat.subCategories.reduce((s, sub) => {
                    const raw = subAmountInputs[sub.id];
                    return (
                      s +
                      (raw !== undefined
                        ? Number(raw) || 0
                        : Math.round((catAmount * (sub.pct ?? 0)) / 100))
                    );
                  }, 0)
                : 0;

            return (
              <div
                key={cat.id}
                className="border border-border rounded-xl overflow-hidden"
                style={{ backgroundColor: "oklch(var(--secondary) / 0.5)" }}
              >
                {/* Category header */}
                <div className="flex items-center gap-2 p-3">
                  {/* Color picker */}
                  <label className="relative cursor-pointer flex-shrink-0">
                    <div
                      className="w-7 h-7 rounded-full border-2 border-white/30 shadow"
                      style={{ backgroundColor: cat.color }}
                    />
                    <input
                      type="color"
                      value={cat.color}
                      onChange={(e) =>
                        updateCat(cat.id, { color: e.target.value })
                      }
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </label>

                  {/* Name */}
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) =>
                      updateCat(cat.id, { name: e.target.value })
                    }
                    className="flex-1 bg-transparent text-sm font-semibold text-foreground outline-none border-b border-transparent focus:border-primary min-w-0"
                  />

                  {/* Allocation value — controlled by global toggle */}
                  <div className="flex flex-col items-end flex-shrink-0 gap-1">
                    {globalAllocMode === "amount" ? (
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={cat.allocationAmount ?? ""}
                            min={0}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              updateCat(cat.id, {
                                allocationAmount: val,
                                allocationMode: "amount",
                                pct: Math.round((val / currentSalary) * 100),
                              });
                            }}
                            className="w-20 text-center text-sm font-bold bg-transparent border border-border rounded px-1 py-0.5 text-foreground"
                            data-ocid="settings.category.amount.input"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          ≈ {autoPct}% of income
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={cat.pct}
                            min={0}
                            max={100}
                            onChange={(e) =>
                              updateCat(cat.id, {
                                pct: Math.max(
                                  0,
                                  Math.min(100, Number(e.target.value)),
                                ),
                              })
                            }
                            className="w-10 text-center text-sm font-bold bg-transparent border border-border rounded px-1 py-0.5 text-foreground"
                            data-ocid="settings.category.pct.input"
                          />
                          <span className="text-xs text-muted-foreground">
                            %
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatAmount(catAmount, config?.currency ?? "PHP")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Reorder */}
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moveCat(cat.id, -1)}
                      disabled={idx === 0}
                      className="disabled:opacity-20 text-muted-foreground"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCat(cat.id, 1)}
                      disabled={idx === localCats.length - 1}
                      className="disabled:opacity-20 text-muted-foreground"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => requestDeleteCat(cat.id)}
                    className="text-destructive flex-shrink-0"
                    title="Delete category"
                    data-ocid="settings.category.delete_button"
                  >
                    <Trash2 size={14} />
                  </button>

                  {/* Expand */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCatId(expandedCatId === cat.id ? null : cat.id)
                    }
                    className="text-muted-foreground flex-shrink-0"
                  >
                    {expandedCatId === cat.id ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                </div>

                {/* Subcategory list */}
                {expandedCatId === cat.id && (
                  <div className="px-3 pb-3 pt-2 space-y-3 border-t border-border">
                    {/* Sub-allocation badge */}
                    {cat.subCategories.length > 0 && (
                      <div className="flex items-center justify-between mb-1">
                        <div
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor:
                              globalAllocMode === "amount"
                                ? subAmountTotal <= catAmount
                                  ? "#20D18A22"
                                  : "#EB575722"
                                : isSubValid
                                  ? "#20D18A22"
                                  : "#EB575722",
                            color:
                              globalAllocMode === "amount"
                                ? subAmountTotal <= catAmount
                                  ? "#20D18A"
                                  : "#EB5757"
                                : isSubValid
                                  ? "#20D18A"
                                  : "#EB5757",
                          }}
                          data-ocid="settings.sub_allocation.panel"
                        >
                          {globalAllocMode === "amount" ? (
                            <>
                              Subs: ₱
                              {Math.round(subAmountTotal).toLocaleString()} / ₱
                              {Math.round(catAmount).toLocaleString()}{" "}
                              {subAmountTotal <= catAmount
                                ? "✓"
                                : `⚠ ₱${Math.round(subAmountTotal - catAmount).toLocaleString()} over`}
                            </>
                          ) : (
                            <>
                              Subs: {subTotal}%{" "}
                              {isSubValid ? "✓" : "(must be 100%)"}
                            </>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          % of {cat.name} (
                          {formatAmount(catAmount, config?.currency ?? "PHP")})
                        </span>
                      </div>
                    )}

                    {cat.subCategories.map((sub) => {
                      const subPct = sub.pct ?? 0;
                      const subAmount = (catAmount * subPct) / 100;
                      // In ₱ mode, use the controlled input value;
                      // fall back to stored amountValue to avoid pct round-trip drift
                      const subAmountDisplay =
                        globalAllocMode === "amount"
                          ? (subAmountInputs[sub.id] ??
                            (sub.amountValue != null
                              ? String(sub.amountValue)
                              : String(Math.round(subAmount))))
                          : undefined;
                      return (
                        <div key={sub.id} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            {/* Sub color override */}
                            <label className="relative cursor-pointer flex-shrink-0">
                              <div
                                className="w-5 h-5 rounded-full border border-white/30"
                                style={{
                                  backgroundColor: sub.color ?? cat.color,
                                  opacity: sub.color ? 1 : 0.5,
                                }}
                                title={
                                  sub.color
                                    ? "Click to change color"
                                    : "Inherits parent color \u2014 click to override"
                                }
                              />
                              <input
                                type="color"
                                value={sub.color ?? cat.color}
                                onChange={(e) =>
                                  updateSub(cat.id, sub.id, {
                                    color: e.target.value,
                                  })
                                }
                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                              />
                            </label>
                            {sub.color && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateSub(cat.id, sub.id, {
                                    color: undefined,
                                  })
                                }
                                className="text-muted-foreground"
                                title="Clear color override"
                              >
                                <X size={10} />
                              </button>
                            )}
                            <input
                              type="text"
                              value={sub.name}
                              onChange={(e) =>
                                updateSub(cat.id, sub.id, {
                                  name: e.target.value,
                                })
                              }
                              className="flex-1 bg-transparent text-sm text-foreground outline-none border-b border-transparent focus:border-primary min-w-0"
                              data-ocid="settings.subcategory.input"
                            />
                            <button
                              type="button"
                              onClick={() => removeSub(cat.id, sub.id)}
                              className="text-destructive flex-shrink-0"
                              data-ocid="settings.subcategory.delete_button"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {/* Subcategory allocation row */}
                          <div className="flex items-center gap-2 pl-7">
                            {globalAllocMode === "amount" ? (
                              // ₱ mode: fully controlled input keyed by sub.id
                              <>
                                <input
                                  type="number"
                                  value={subAmountDisplay}
                                  min={0}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSubAmountInputs((prev) => ({
                                      ...prev,
                                      [sub.id]: val,
                                    }));
                                    const enteredAmt = Math.max(
                                      0,
                                      Number(val) || 0,
                                    );
                                    // Back-calculate pct for display/compat; store amountValue as truth
                                    const newPct =
                                      catAmount > 0
                                        ? Math.min(
                                            100,
                                            Math.round(
                                              (enteredAmt / catAmount) * 100,
                                            ),
                                          )
                                        : 0;
                                    updateSub(cat.id, sub.id, {
                                      pct: newPct,
                                      amountValue: enteredAmt,
                                    });
                                  }}
                                  className="w-20 text-center text-xs font-bold bg-transparent border border-border rounded px-1 py-1 text-foreground"
                                  data-ocid="settings.subcategory.amount.input"
                                />
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-muted-foreground">
                                    ≈ {subPct}%
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    of {cat.name}
                                  </span>
                                </div>
                                <div
                                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                                  style={{
                                    backgroundColor: "oklch(var(--muted))",
                                  }}
                                >
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${subPct}%`,
                                      backgroundColor: sub.color ?? cat.color,
                                    }}
                                  />
                                </div>
                              </>
                            ) : (
                              // % mode: show percentage input
                              <>
                                <input
                                  type="number"
                                  value={subPct}
                                  min={0}
                                  max={100}
                                  onChange={(e) =>
                                    updateSub(cat.id, sub.id, {
                                      pct: Math.max(
                                        0,
                                        Math.min(
                                          100,
                                          Number(e.target.value) || 0,
                                        ),
                                      ),
                                    })
                                  }
                                  className="w-16 text-center text-xs font-bold bg-transparent border border-border rounded px-1 py-1 text-foreground"
                                  data-ocid="settings.subcategory.pct.input"
                                />
                                <span className="text-xs text-muted-foreground">
                                  %
                                </span>
                                <div
                                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                                  style={{
                                    backgroundColor: "oklch(var(--muted))",
                                  }}
                                >
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${subPct}%`,
                                      backgroundColor: sub.color ?? cat.color,
                                    }}
                                  />
                                </div>
                                <div className="text-right flex-shrink-0 min-w-[72px]">
                                  <span
                                    className="text-xs font-bold"
                                    style={{ color: sub.color ?? cat.color }}
                                  >
                                    of {cat.name}
                                  </span>
                                  <br />
                                  <span className="text-[10px] text-muted-foreground">
                                    ={" "}
                                    {formatAmount(
                                      subAmount,
                                      config?.currency ?? "PHP",
                                    )}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Per-category subcategory warning in ₱ mode */}
                    {globalAllocMode === "amount" &&
                      cat.subCategories.length > 0 &&
                      subAmountTotal > catAmount && (
                        <div
                          className="text-xs px-2 py-1.5 rounded-lg mt-1"
                          style={{
                            backgroundColor: "#EB575722",
                            color: "#EB5757",
                          }}
                        >
                          Subcategories exceed {cat.name} budget by ₱
                          {Math.round(
                            subAmountTotal - catAmount,
                          ).toLocaleString()}
                        </div>
                      )}

                    <button
                      type="button"
                      onClick={() => addSubToCategory(cat.id)}
                      className="flex items-center gap-1 text-xs mt-2 px-2 py-1 rounded-lg"
                      style={{
                        backgroundColor: `${cat.color}22`,
                        color: cat.color,
                      }}
                      data-ocid="settings.subcategory.button"
                    >
                      <Plus size={12} /> Add subcategory
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Preferences */}
      <Section title="Preferences">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isDark ? <Moon size={16} /> : <Sun size={16} />}
              <span className="text-sm">
                {isDark ? t("darkMode") : t("lightMode")}
              </span>
            </div>
            <Switch
              checked={isDark}
              onCheckedChange={handleThemeToggle}
              data-ocid="settings.theme.switch"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">
              {t("language")}: {lang === "en" ? "English" : "Tagalog"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLangToggle}
              data-ocid="settings.language.toggle"
            >
              Switch
            </Button>
          </div>
        </div>
      </Section>

      {/* Period Management */}
      <Section title={t("periodManagement")}>
        <div className="text-xs text-muted-foreground mb-3">
          {periods.length} archived period{periods.length !== 1 ? "s" : ""}
        </div>
        {config && (
          <div className="text-xs text-muted-foreground mb-3">
            Current: {config.startDate} &rarr; {currentPeriodEnd}
          </div>
        )}
        <div className="mb-3">
          <Label className="text-xs">Period Type</Label>
          <select
            className="w-full mt-1 p-2 rounded-lg border border-border bg-card text-foreground text-sm"
            value={config?.period ?? "monthly"}
            onChange={(e) =>
              setConfig((prev) =>
                prev
                  ? {
                      ...prev,
                      period: e.target.value as import("../types").Period,
                    }
                  : prev,
              )
            }
            data-ocid="settings.period_type.select"
          >
            <option value="monthly">Monthly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="weekly">Weekly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        {config?.period === "custom" && (
          <>
            <div className="mb-3">
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={config.customStartDate ?? config.startDate ?? ""}
                onChange={(e) =>
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          customStartDate: e.target.value,
                          startDate: e.target.value,
                        }
                      : prev,
                  )
                }
                className="mt-1"
                data-ocid="settings.custom_start_date.input"
              />
            </div>
            <div className="mb-3">
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                value={config.customEndDate ?? ""}
                onChange={(e) =>
                  setConfig((prev) =>
                    prev ? { ...prev, customEndDate: e.target.value } : prev,
                  )
                }
                className="mt-1"
                data-ocid="settings.custom_end_date.input"
              />
            </div>
          </>
        )}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setConfirmNewPeriod(true)}
          data-ocid="settings.new_period.button"
        >
          <RefreshCw size={14} />
          {t("startNewPeriod")}
        </Button>
      </Section>

      {/* Data Backup Section */}
      <Section title="Data Backup">
        <p className="text-xs text-muted-foreground mb-3">
          Export all your data as a backup file, or restore from a previous
          backup.
        </p>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleExportBackup}
            data-ocid="settings.backup.export_button"
          >
            <Database size={14} />
            Export Backup
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => backupFileRef.current?.click()}
            data-ocid="settings.backup.import_button"
          >
            <Upload size={14} />
            Import Backup
          </Button>
          <input
            ref={backupFileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleRestoreFileSelect}
          />
        </div>
      </Section>

      {/* Data Management */}
      <Section title="Data Management">
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={exportData}
            data-ocid="settings.export.button"
          >
            <Download size={14} />
            {t("exportData")}
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => fileInputRef.current?.click()}
            data-ocid="settings.import.button"
          >
            <Upload size={14} />
            {t("importData")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            variant="outline"
            className="w-full gap-2"
            style={{ borderColor: "#EB5757", color: "#EB5757" }}
            onClick={() => setConfirmReset(true)}
            data-ocid="settings.reset.delete_button"
          >
            <RotateCcw size={14} />
            {t("resetData")}
          </Button>
        </div>
      </Section>

      <Button
        onClick={handleSave}
        className="w-full mt-4"
        disabled={!canSave}
        style={{
          backgroundColor: canSave ? "oklch(var(--primary))" : undefined,
          color: canSave ? "oklch(var(--primary-foreground))" : undefined,
        }}
        data-ocid="settings.save.submit_button"
      >
        {t("save")}
        {!isValidAllocation && ` (${effectivePctTotal}%)`}
        {isValidAllocation &&
          !isValidSubAllocation &&
          globalAllocMode === "pct" &&
          " \u2014 Fix sub allocations"}
      </Button>

      {/* Merge/Delete Category Dialog */}
      <Dialog
        open={!!mergeDeleteId}
        onOpenChange={(o) => !o && setMergeDeleteId(null)}
      >
        <DialogContent data-ocid="settings.delete_category.dialog">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Move all transactions from{" "}
            <strong>
              {localCats.find((c) => c.id === mergeDeleteId)?.name}
            </strong>{" "}
            to:
          </p>
          <select
            className="w-full p-2 rounded-lg border border-border bg-card text-foreground text-sm"
            value={mergeTargetId}
            onChange={(e) => setMergeTargetId(e.target.value)}
            data-ocid="settings.merge_target.select"
          >
            {localCats
              .filter((c) => c.id !== mergeDeleteId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setMergeDeleteId(null)}
              data-ocid="settings.delete_category.cancel_button"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={confirmDeleteCat}
              style={{ backgroundColor: "#EB5757", color: "#fff" }}
              data-ocid="settings.delete_category.confirm_button"
            >
              Delete & Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Period Dialog */}
      <Dialog open={confirmNewPeriod} onOpenChange={setConfirmNewPeriod}>
        <DialogContent data-ocid="settings.new_period.dialog">
          <DialogHeader>
            <DialogTitle>{t("startNewPeriod")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("confirmNewPeriod")}
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmNewPeriod(false)}
              data-ocid="settings.new_period.cancel_button"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={() => {
                startNewPeriod();
                setConfirmNewPeriod(false);
                toast.success("New period started!");
              }}
              style={{
                backgroundColor: "oklch(var(--primary))",
                color: "oklch(var(--primary-foreground))",
              }}
              data-ocid="settings.new_period.confirm_button"
            >
              {t("done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Restore Warning */}
      <AlertDialog open={showBackupWarning} onOpenChange={setShowBackupWarning}>
        <AlertDialogContent data-ocid="settings.backup.warning.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Backup</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite all your current data. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowBackupWarning(false);
                setPendingRestoreFile(null);
              }}
              data-ocid="settings.backup.warning.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRestore}
              data-ocid="settings.backup.warning.confirm_button"
            >
              Yes, Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Dialog */}
      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent data-ocid="settings.reset.dialog">
          <DialogHeader>
            <DialogTitle>Reset All Data</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("confirmReset")}</p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmReset(false)}
              data-ocid="settings.reset.cancel_button"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={() => {
                resetAllData();
                setConfirmReset(false);
              }}
              style={{ backgroundColor: "#EB5757", color: "#fff" }}
              data-ocid="settings.reset.confirm_button"
            >
              {t("reset")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-border p-4 mb-4"
      style={{ backgroundColor: "oklch(var(--card))" }}
    >
      <h2 className="text-sm font-semibold text-muted-foreground mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}
