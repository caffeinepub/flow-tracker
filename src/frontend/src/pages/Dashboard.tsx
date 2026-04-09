import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { addMonths, format, parseISO, subDays } from "date-fns";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  HandCoins,
  PiggyBank,
  Target,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import type { Tab } from "../components/BottomNav";
import { CategoryIcon } from "../components/CategoryIcon";
import { HelpSheet } from "../components/HelpSheet";
import { formatAmount } from "../data/categories";
import { useFinanceData } from "../hooks/useFinanceData";
import { useTranslation } from "../hooks/useTranslation";

interface DashboardProps {
  onNavigate?: (tab: Tab) => void;
  privacyMode?: boolean;
}

const GOAL_PREVIEW_COUNT = 3;
const COLLAPSE_KEY = "flow_dashboard_sections";

function loadCollapsed(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(COLLAPSE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// ── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({
  data,
  color = "var(--indigo)",
  width = 80,
  height = 28,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - 4 - ((v - min) / range) * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      className="animate-sparkle opacity-70"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Circular Progress Ring ────────────────────────────────────────────────────
let _gradientCounter = 0;
function CircularProgress({
  percent,
  size = 64,
  label,
  sublabel,
  reached = false,
}: {
  percent: number;
  size?: number;
  label?: string;
  sublabel?: string;
  reached?: boolean;
}) {
  const gradientId = useMemo(() => `goal-grad-${++_gradientCounter}`, []);
  const stroke = 5;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transition-spring"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--indigo)" />
            <stop offset="100%" stopColor="var(--teal)" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="oklch(var(--border))"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && (
          <span
            className="font-display font-bold leading-none"
            style={{
              fontSize: size * 0.2,
              color: reached ? "var(--teal)" : "var(--indigo)",
            }}
          >
            {label}
          </span>
        )}
        {sublabel && (
          <span
            className="text-muted-foreground leading-none mt-0.5"
            style={{ fontSize: size * 0.14 }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Mini stat cell ────────────────────────────────────────────────────────────
function StatCell({
  label,
  value,
  accent,
  sparklineData,
  sparklineColor,
}: {
  label: string;
  value: string;
  accent?: "positive" | "negative" | "default";
  sparklineData?: number[];
  sparklineColor?: string;
}) {
  const valueColor =
    accent === "positive"
      ? "oklch(var(--success))"
      : accent === "negative"
        ? "oklch(var(--destructive))"
        : "oklch(var(--foreground))";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-end gap-2">
        <span
          className="font-display font-bold text-base leading-none"
          style={{ color: valueColor }}
        >
          {value}
        </span>
        {sparklineData && sparklineData.length >= 2 && (
          <Sparkline
            data={sparklineData}
            color={sparklineColor ?? "var(--indigo)"}
            width={60}
            height={22}
          />
        )}
      </div>
    </div>
  );
}

// ── Section header with collapse toggle ──────────────────────────────────────
function SectionHeader({
  label,
  icon,
  collapsed,
  onToggle,
  action,
  ocid,
}: {
  label: string;
  icon?: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  ocid?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <button
        type="button"
        className="flex items-center gap-2 flex-1 text-left"
        onClick={onToggle}
        data-ocid={ocid}
      >
        {icon}
        <h2 className="font-semibold text-sm text-muted-foreground">{label}</h2>
        {collapsed ? (
          <ChevronRight size={13} className="text-muted-foreground ml-auto" />
        ) : (
          <ChevronDown size={13} className="text-muted-foreground ml-auto" />
        )}
      </button>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function Dashboard({ onNavigate, privacyMode = false }: DashboardProps) {
  const t = useTranslation();
  const {
    config,
    customCategories,
    currentPeriodEnd,
    getBudgetForCategory,
    getBudgetForSubCategory,
    getSpentForSubCategory,
    totalIncome,
    totalExpenses,
    remaining,
    periodProgress,
    getCCAlerts,
    totalIOUsOwed,
    goals,
    projectionSettings,
    addTransaction,
    transactions,
    periods,
  } = useFinanceData();

  const currency = config?.currency ?? "PHP";
  const pAmt = (val: number) =>
    privacyMode ? "••••••" : formatAmount(val, currency);
  const ccAlerts = getCCAlerts();
  const [showAllGoals, setShowAllGoals] = useState(false);
  const [dismissedExpiry, setDismissedExpiry] = useState(false);
  const [showExcessPrompt, setShowExcessPrompt] = useState(true);
  const [showExcessSheet, setShowExcessSheet] = useState(false);
  const [selectedSavingsGoal, setSelectedSavingsGoal] =
    useState<string>("__general__");
  const [expandedGoalHistory, setExpandedGoalHistory] = useState<Set<string>>(
    new Set(),
  );

  const toggleGoalHistory = (goalId: string) => {
    setExpandedGoalHistory((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) next.delete(goalId);
      else next.add(goalId);
      return next;
    });
  };

  // All transactions across current + archived periods, deduplicated
  const allTransactions = useMemo(() => {
    const seen = new Set<string>();
    const all = [...transactions];
    for (const tx of all) seen.add(tx.id);
    for (const p of periods) {
      for (const tx of p.transactions) {
        if (!seen.has(tx.id)) {
          seen.add(tx.id);
          all.push(tx);
        }
      }
    }
    return all;
  }, [transactions, periods]);

  // Collapsible sections — persisted in localStorage
  const [collapsed, setCollapsed] =
    useState<Record<string, boolean>>(loadCollapsed);

  const toggleSection = (key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const isCollapsed = (key: string) => !!collapsed[key];

  // Period expiry check
  const isPeriodExpired = config
    ? format(new Date(), "yyyy-MM-dd") > currentPeriodEnd
    : false;

  // Excess to savings
  const excessPromptKey = config
    ? `flow_excess_prompted_${config.startDate}`
    : null;
  const hasBeenPrompted = excessPromptKey
    ? !!localStorage.getItem(excessPromptKey)
    : true;
  const showExcessCard =
    isPeriodExpired && remaining > 0 && !hasBeenPrompted && showExcessPrompt;

  // Savings goals for excess prompt
  const savingsGoals = useMemo(() => {
    return goals.filter((g) => {
      if (!g.subCategoryId) return false;
      for (const cat of customCategories) {
        if (cat.name.toLowerCase().includes("sav")) {
          if (cat.subCategories.some((s) => s.id === g.subCategoryId))
            return true;
        }
      }
      return false;
    });
  }, [goals, customCategories]);

  const handleMoveToSavings = () => {
    if (!config) return;
    const savingsCat = customCategories.find((c) =>
      c.name.toLowerCase().includes("sav"),
    );
    const catName = savingsCat?.name ?? "Savings";
    let subCatName = "General";
    if (selectedSavingsGoal !== "__general__") {
      const goal = savingsGoals.find((g) => g.id === selectedSavingsGoal);
      if (goal) subCatName = goal.subCategoryName;
    }
    addTransaction({
      amount: remaining,
      date: format(new Date(), "yyyy-MM-dd"),
      mainCategory: catName,
      subCategory: subCatName,
      description: "Excess to Savings",
      type: "expense",
    });
    if (excessPromptKey) localStorage.setItem(excessPromptKey, "1");
    setShowExcessPrompt(false);
    setShowExcessSheet(false);
    toast.success(`₱${remaining.toLocaleString()} moved to savings!`);
  };

  const handleSkipExcess = () => {
    if (excessPromptKey) localStorage.setItem(excessPromptKey, "1");
    setShowExcessPrompt(false);
  };

  const pieData = useMemo(() => {
    return customCategories.map((cat) => ({
      name: cat.name,
      value: getBudgetForCategory(cat.name),
      color: cat.color,
    }));
  }, [customCategories, getBudgetForCategory]);

  const periodLabel = config
    ? `${format(parseISO(config.startDate), "MMM d")} – ${format(parseISO(currentPeriodEnd), "MMM d, yyyy")}`
    : "";

  // Build all-subs list for goal monthly budget lookup
  const allSubsForGoals = useMemo(
    () =>
      customCategories.flatMap((cat) =>
        cat.subCategories.map((sub) => ({
          id: sub.id,
          monthlyBudget: getBudgetForSubCategory(cat.name, sub.name),
        })),
      ),
    [customCategories, getBudgetForSubCategory],
  );

  // Compute goal display info
  const goalCards = useMemo(() => {
    return goals
      .filter((g) => g.targetAmount > 0)
      .map((goal) => {
        const monthly =
          allSubsForGoals.find((s) => s.id === goal.subCategoryId)
            ?.monthlyBudget ?? projectionSettings.monthlyIncome * 0.2;
        // Save to Goal transactions are stored as type "income" (they credit the account).
        // Match by goalId — no type filter needed since goalId is only set on goal-linked txs.
        const linkedTxSum = allTransactions
          .filter((tx) => tx.goalId === goal.id)
          .reduce((s, tx) => s + tx.amount, 0);
        const saved = (goal.alreadySavedAmount ?? 0) + linkedTxSum;
        const rem = Math.max(0, goal.targetAmount - saved);
        const progressPct =
          goal.targetAmount > 0
            ? Math.min(100, (saved / goal.targetAmount) * 100)
            : 0;
        const monthsToReach =
          rem <= 0 ? 0 : monthly > 0 ? Math.ceil(rem / monthly) : null;
        const goalTxHistory = allTransactions
          .filter((tx) => tx.goalId === goal.id)
          .sort((a, b) => b.date.localeCompare(a.date));
        return {
          goal,
          saved,
          remaining: rem,
          progressPct,
          monthly,
          monthsToReach,
          goalTxHistory,
        };
      });
  }, [
    goals,
    allSubsForGoals,
    projectionSettings.monthlyIncome,
    allTransactions,
  ]);

  const visibleGoalCards = showAllGoals
    ? goalCards
    : goalCards.slice(0, GOAL_PREVIEW_COUNT);

  const hasGoals = goalCards.length > 0;

  // ── Sparkline data: last 7 days expenses, grouped by day ─────────────────
  const expenseSparklineData = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i);
      return format(d, "yyyy-MM-dd");
    });
    return days.map((day) =>
      transactions
        .filter((tx) => tx.type === "expense" && tx.date === day)
        .reduce((s, tx) => s + tx.amount, 0),
    );
  }, [transactions]);

  return (
    <div className="pb-28 fade-in">
      {/* ── Period label + help ──────────────────────────────────────────────── */}
      <div className="px-4 py-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">
          {periodLabel}
        </p>
        <HelpSheet section="dashboard" language={config?.language ?? "en"} />
      </div>

      {/* ── Period Expired Banner ─────────────────────────────────────────────── */}
      {isPeriodExpired && !dismissedExpiry && (
        <div className="px-4 mb-3 animate-spring-in">
          <div
            className="w-full flex items-center gap-2 p-3 rounded-xl border"
            style={{
              backgroundColor: "oklch(0.7 0.15 60 / 0.1)",
              borderColor: "oklch(0.7 0.15 60 / 0.4)",
            }}
            data-ocid="dashboard.period_expired.card"
          >
            <span
              className="text-xs font-semibold flex-1"
              style={{ color: "oklch(0.7 0.15 60)" }}
            >
              ⏰ Your period ended {format(parseISO(currentPeriodEnd), "MMM d")}
              . Ready to start a new one?
            </span>
            <button
              type="button"
              onClick={() => onNavigate?.("settings")}
              className="text-xs underline flex-shrink-0"
              style={{ color: "oklch(0.7 0.15 60)" }}
              data-ocid="dashboard.period_expired.button"
            >
              Start
            </button>
            <button
              type="button"
              onClick={() => setDismissedExpiry(true)}
              className="text-xs text-muted-foreground ml-1 flex-shrink-0"
              data-ocid="dashboard.period_expired.close_button"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Excess to Savings Prompt ──────────────────────────────────────────── */}
      {showExcessCard && (
        <div className="px-4 mb-3 animate-spring-in">
          <div
            className="glass-card w-full p-3"
            style={{ borderColor: "oklch(0.6 0.18 150 / 0.35)" }}
            data-ocid="dashboard.excess_savings.card"
          >
            <div className="flex items-start gap-2 mb-3">
              <PiggyBank
                size={16}
                className="flex-shrink-0 mt-0.5"
                style={{ color: "var(--teal)" }}
              />
              <p
                className="text-xs font-medium flex-1"
                style={{ color: "var(--teal)" }}
              >
                You have {pAmt(remaining)} unspent this period.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 text-xs py-2 px-3 rounded-lg font-semibold transition-spring"
                style={{
                  backgroundColor: "oklch(0.60 0.22 195 / 0.15)",
                  color: "var(--teal)",
                }}
                onClick={() => setShowExcessSheet(true)}
                data-ocid="dashboard.excess_savings.move_button"
              >
                Move to Savings
              </button>
              <button
                type="button"
                className="text-xs py-2 px-3 rounded-lg font-medium text-muted-foreground bg-secondary"
                onClick={handleSkipExcess}
                data-ocid="dashboard.excess_savings.skip_button"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Excess to Savings Sheet ───────────────────────────────────────────── */}
      <Sheet open={showExcessSheet} onOpenChange={setShowExcessSheet}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl"
          data-ocid="dashboard.excess_savings.sheet"
        >
          <SheetHeader className="mb-4">
            <SheetTitle>Move to Savings</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Move {pAmt(remaining)} unspent budget to savings.
          </p>
          {savingsGoals.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">
                Choose destination
              </p>
              <Select
                value={selectedSavingsGoal}
                onValueChange={setSelectedSavingsGoal}
              >
                <SelectTrigger data-ocid="dashboard.excess_savings.select">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__general__">General Savings</SelectItem>
                  {savingsGoals.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.label || g.subCategoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleMoveToSavings}
              data-ocid="dashboard.excess_savings.confirm_button"
            >
              Confirm Move
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowExcessSheet(false)}
              data-ocid="dashboard.excess_savings.cancel_button"
            >
              Cancel
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── CC Alerts Banner ──────────────────────────────────────────────────── */}
      {ccAlerts.length > 0 && (
        <div className="px-4 mb-3 animate-spring-in">
          <button
            type="button"
            className="w-full flex items-center gap-2 p-3 rounded-xl border text-left transition-spring"
            style={{
              backgroundColor: "oklch(0.65 0.22 25 / 0.08)",
              borderColor: "oklch(0.65 0.22 25 / 0.4)",
            }}
            onClick={() => onNavigate?.("accounts")}
            data-ocid="dashboard.cc_alerts.card"
          >
            <AlertTriangle
              size={14}
              style={{ color: "#EB5757" }}
              className="flex-shrink-0"
            />
            <span
              className="text-xs font-semibold"
              style={{ color: "#EB5757" }}
            >
              &#9888; {ccAlerts.length} Credit Card Alert
              {ccAlerts.length > 1 ? "s" : ""}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              View &rarr;
            </span>
          </button>
        </div>
      )}

      {/* ── IOU Summary chip ──────────────────────────────────────────────────── */}
      {totalIOUsOwed > 0 && (
        <div className="px-4 mb-3 animate-spring-in">
          <button
            type="button"
            className="w-full flex items-center gap-2 p-3 rounded-xl border text-left transition-spring"
            style={{
              backgroundColor: "oklch(0.60 0.22 195 / 0.08)",
              borderColor: "oklch(0.60 0.22 195 / 0.35)",
            }}
            onClick={() => onNavigate?.("accounts")}
            data-ocid="dashboard.iou_summary.card"
          >
            <HandCoins
              size={14}
              style={{ color: "var(--teal)" }}
              className="flex-shrink-0"
            />
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--teal)" }}
            >
              {pAmt(totalIOUsOwed)} owed to you
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              View IOUs &rarr;
            </span>
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          BENTO GRID HERO — Period Summary + Period Progress + Spending Breakdown
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Period Summary Card — col-span-2 */}
          <div
            className="glass-card card-hover animate-spring-in p-4 sm:col-span-2"
            data-ocid="dashboard.period_summary.card"
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                className="flex items-center gap-2"
                onClick={() => toggleSection("periodSummary")}
                data-ocid="dashboard.period_summary.toggle"
              >
                <TrendingUp size={13} style={{ color: "var(--indigo)" }} />
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("periodSummary")}
                </h2>
                {isCollapsed("periodSummary") ? (
                  <ChevronRight size={12} className="text-muted-foreground" />
                ) : (
                  <ChevronDown size={12} className="text-muted-foreground" />
                )}
              </button>
              {/* Decorative sparkline top-right */}
              {!isCollapsed("periodSummary") && !privacyMode && (
                <Sparkline
                  data={expenseSparklineData}
                  color="var(--indigo)"
                  width={72}
                  height={24}
                />
              )}
            </div>

            {!isCollapsed("periodSummary") && (
              <div className="grid grid-cols-3 gap-3">
                <StatCell
                  label={t("totalIncome")}
                  value={pAmt(totalIncome)}
                  accent="positive"
                />
                <StatCell
                  label={t("totalExpenses")}
                  value={pAmt(totalExpenses)}
                  accent={totalExpenses > 0 ? "negative" : "default"}
                />
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t("remaining")}
                  </span>
                  <span
                    className="font-display font-bold text-lg leading-none"
                    style={{
                      color:
                        remaining >= 0
                          ? "var(--indigo)"
                          : "oklch(var(--destructive))",
                    }}
                  >
                    {pAmt(remaining)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Period Progress Card — col-span-1 */}
          <div
            className="glass-card card-hover animate-spring-in p-4 sm:col-span-1 flex flex-col items-center justify-center gap-2"
            style={{ animationDelay: "75ms" }}
            data-ocid="dashboard.period_progress.card"
          >
            <button
              type="button"
              className="flex items-center gap-1 mb-1"
              onClick={() => toggleSection("periodProgress")}
              data-ocid="dashboard.period_progress.toggle"
            >
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("periodProgress")}
              </h2>
              {isCollapsed("periodProgress") ? (
                <ChevronRight size={12} className="text-muted-foreground" />
              ) : (
                <ChevronDown size={12} className="text-muted-foreground" />
              )}
            </button>
            {!isCollapsed("periodProgress") && (
              <CircularProgress
                percent={periodProgress}
                size={80}
                label={`${Math.round(periodProgress)}%`}
                sublabel="elapsed"
              />
            )}
          </div>

          {/* Spending Breakdown — col-span-3 full width */}
          <div
            className="glass-card card-hover animate-spring-in sm:col-span-3"
            style={{ animationDelay: "150ms" }}
          >
            <button
              type="button"
              className="w-full flex items-center justify-between p-4"
              onClick={() => toggleSection("budgetBreakdown")}
              data-ocid="dashboard.budget_breakdown.toggle"
            >
              <h2 className="font-semibold text-sm text-muted-foreground">
                {t("budgetBreakdown")}
              </h2>
              {isCollapsed("budgetBreakdown") ? (
                <ChevronRight size={14} className="text-muted-foreground" />
              ) : (
                <ChevronDown size={14} className="text-muted-foreground" />
              )}
            </button>
            {!isCollapsed("budgetBreakdown") && (
              <div className="flex items-center gap-4 px-4 pb-4">
                <div className="w-36 h-36 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={64}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) =>
                          formatAmount(value, currency)
                        }
                        contentStyle={{
                          backgroundColor: "var(--glass-bg)",
                          backdropFilter: "blur(12px)",
                          border: "1px solid var(--glass-border)",
                          borderRadius: 10,
                        }}
                        labelStyle={{ color: "oklch(var(--foreground))" }}
                        itemStyle={{ color: "oklch(var(--muted-foreground))" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {customCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">
                          {cat.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pAmt(getBudgetForCategory(cat.name))}
                        </div>
                      </div>
                      <span
                        className="text-xs font-bold"
                        style={{ color: cat.color }}
                      >
                        {cat.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          FINANCIAL GOALS
      ════════════════════════════════════════════════════════════════════════ */}
      {hasGoals && (
        <div
          className="px-4 mt-2 mb-4 animate-spring-in"
          style={{ animationDelay: "300ms" }}
        >
          <SectionHeader
            label="Financial Goals"
            icon={<Target size={13} style={{ color: "var(--indigo)" }} />}
            collapsed={isCollapsed("goalProgress")}
            onToggle={() => toggleSection("goalProgress")}
            ocid="dashboard.goals.toggle"
            action={
              <button
                type="button"
                className="text-xs ml-2 flex-shrink-0 transition-spring"
                style={{ color: "var(--indigo)" }}
                onClick={() => onNavigate?.("projections")}
                data-ocid="dashboard.goals.link"
              >
                View →
              </button>
            }
          />
          {!isCollapsed("goalProgress") && (
            <>
              <div
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                data-ocid="dashboard.goals.list"
              >
                {visibleGoalCards.map(
                  (
                    {
                      goal,
                      saved,
                      remaining: rem,
                      progressPct,
                      monthly,
                      monthsToReach,
                      goalTxHistory,
                    },
                    idx,
                  ) => {
                    const reachDate =
                      monthsToReach !== null && monthsToReach > 0
                        ? addMonths(new Date(), monthsToReach)
                        : null;
                    const isHistoryExpanded = expandedGoalHistory.has(goal.id);
                    const goalReached = rem === 0;
                    return (
                      <div
                        key={goal.id}
                        className={`glass-card card-hover animate-spring-in p-3 ${goalReached ? "glow-teal" : ""}`}
                        style={{ animationDelay: `${idx * 80}ms` }}
                        data-ocid={`dashboard.goal.item.${idx + 1}`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Circular progress ring */}
                          <CircularProgress
                            percent={progressPct}
                            size={64}
                            label={`${Math.round(progressPct)}%`}
                            reached={goalReached}
                          />
                          {/* Goal info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate font-display">
                              {goal.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground mb-1">
                              {goal.subCategoryName}
                            </p>
                            <div className="flex justify-between items-center">
                              <span
                                className="text-xs font-semibold"
                                style={{
                                  color: goalReached
                                    ? "var(--teal)"
                                    : "oklch(var(--muted-foreground))",
                                }}
                              >
                                {goalReached
                                  ? "🎉 Goal reached!"
                                  : `${pAmt(rem)} to go`}
                              </span>
                              {reachDate && monthly > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  ~{monthsToReach}mo (
                                  {format(reachDate, "MMM yy")})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Goal history toggle */}
                        {((goal.alreadySavedAmount ?? 0) > 0 ||
                          goalTxHistory.length > 0) && (
                          <button
                            type="button"
                            className="mt-2 w-full flex items-center justify-between text-[10px] text-muted-foreground py-1.5 border-t border-border"
                            onClick={() => toggleGoalHistory(goal.id)}
                            data-ocid={`dashboard.goal.history_toggle.${idx + 1}`}
                          >
                            <span>
                              History (
                              {goalTxHistory.length +
                                ((goal.alreadySavedAmount ?? 0) > 0
                                  ? 1
                                  : 0)}{" "}
                              entries)
                            </span>
                            {isHistoryExpanded ? (
                              <ChevronUp size={10} />
                            ) : (
                              <ChevronDown size={10} />
                            )}
                          </button>
                        )}

                        {/* Goal history entries */}
                        {isHistoryExpanded && (
                          <div
                            className="mt-1 space-y-1"
                            data-ocid={`dashboard.goal.history.${idx + 1}`}
                          >
                            {(goal.alreadySavedAmount ?? 0) > 0 && (
                              <div
                                className="flex items-center justify-between py-1 px-1.5 rounded-lg"
                                style={{
                                  backgroundColor:
                                    "oklch(var(--secondary) / 0.5)",
                                }}
                              >
                                <div>
                                  <p className="text-[10px] font-medium text-foreground">
                                    Opening
                                  </p>
                                  <p className="text-[9px] text-muted-foreground">
                                    {goal.startDate
                                      ? format(
                                          parseISO(goal.startDate),
                                          "MMM d, yyyy",
                                        )
                                      : "—"}
                                  </p>
                                </div>
                                <span
                                  className="text-[10px] font-semibold"
                                  style={{ color: "var(--indigo)" }}
                                >
                                  +{pAmt(goal.alreadySavedAmount ?? 0)}
                                </span>
                              </div>
                            )}
                            {goalTxHistory.map((tx) => (
                              <div
                                key={tx.id}
                                className="flex items-center justify-between py-1 px-1.5 rounded-lg"
                                style={{
                                  backgroundColor:
                                    "oklch(var(--secondary) / 0.5)",
                                }}
                              >
                                <div>
                                  <p className="text-[10px] font-medium text-foreground truncate max-w-[130px]">
                                    {tx.description || `Saved to ${goal.label}`}
                                  </p>
                                  <p className="text-[9px] text-muted-foreground">
                                    {format(parseISO(tx.date), "MMM d, yyyy")}
                                  </p>
                                </div>
                                <span
                                  className="text-[10px] font-semibold flex-shrink-0"
                                  style={{ color: "var(--indigo)" }}
                                >
                                  +{pAmt(tx.amount)}
                                </span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between pt-1 border-t border-border">
                              <span className="text-[9px] text-muted-foreground font-medium">
                                Total saved
                              </span>
                              <span
                                className="text-[10px] font-bold"
                                style={{ color: "var(--indigo)" }}
                              >
                                {pAmt(saved)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>

              {goalCards.length > GOAL_PREVIEW_COUNT && (
                <button
                  type="button"
                  className="w-full mt-2 py-2 text-xs flex items-center justify-center gap-1 transition-spring"
                  style={{ color: "var(--indigo)" }}
                  onClick={() => setShowAllGoals((v) => !v)}
                  data-ocid="dashboard.goals.expand_toggle"
                >
                  {showAllGoals ? (
                    <>
                      <ChevronUp size={12} /> Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown size={12} /> See all {goalCards.length} goals
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          CATEGORY SPENDING
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="px-4 mt-2 mb-4">
        <SectionHeader
          label={t("categorySpending")}
          collapsed={isCollapsed("categorySpending")}
          onToggle={() => toggleSection("categorySpending")}
          ocid="dashboard.category_spending.toggle"
        />
        {!isCollapsed("categorySpending") && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {customCategories.flatMap((cat) =>
              cat.subCategories.map((sub) => {
                const budget = getBudgetForSubCategory(cat.name, sub.name);
                const spent = getSpentForSubCategory(sub.name);
                const pct =
                  budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
                const effectiveColor = sub.color ?? cat.color;
                const barColor =
                  pct >= 100
                    ? "#EB5757"
                    : pct >= 80
                      ? "#F2C94C"
                      : effectiveColor;
                return (
                  <div
                    key={`${cat.id}-${sub.id}`}
                    className="glass-card-sm card-hover flex items-center gap-3 p-3"
                  >
                    <CategoryIcon
                      iconName={sub.icon}
                      badgeColor={effectiveColor}
                      size={16}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-foreground truncate">
                          {sub.name}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                          {pAmt(spent)}
                        </span>
                      </div>
                      <div
                        className="mt-1 h-1 rounded-full overflow-hidden"
                        style={{ backgroundColor: "oklch(var(--muted))" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {t("budget")}: {pAmt(budget)}
                        {sub.pct ? ` (${sub.pct}%)` : ""}
                      </div>
                    </div>
                  </div>
                );
              }),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
