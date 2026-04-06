import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
} from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HelpSheet } from "../components/HelpSheet";
import { formatAmount } from "../data/categories";
import { useFinanceData } from "../hooks/useFinanceData";
import { useTranslation } from "../hooks/useTranslation";
import { Recurring } from "./Recurring";

// Duration picker types
type DurationMode = "period" | "month";

export function Reports() {
  const t = useTranslation();
  const {
    config,
    customCategories,
    currentTransactions,
    periods,
    transactions,
    getBudgetForCategory,
    getBudgetForSubCategory,
    getSpentForCategory,
    getSpentForSubCategory,
    currentPeriodEnd,
  } = useFinanceData();
  const currency = config?.currency ?? "PHP";

  // ── Year picker state ───────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // ── YTD state ──────────────────────────────────────────────────────────────
  const [durationMode, setDurationMode] = useState<DurationMode>("period");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("current");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM"),
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ── Compute available years from all transaction dates ──────────────────────
  const availableYears = useMemo(() => {
    const yearSet = new Set<number>([currentYear]);
    const allTxs = [...transactions];
    for (const p of periods) allTxs.push(...p.transactions);
    for (const tx of allTxs) {
      const y = Number(tx.date.slice(0, 4));
      if (!Number.isNaN(y)) yearSet.add(y);
    }
    // Also include year from config.startDate
    if (config?.startDate) {
      const y = Number(config.startDate.slice(0, 4));
      if (!Number.isNaN(y)) yearSet.add(y);
    }
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [transactions, periods, currentYear, config]);

  // ── Filter period chips by selected year ────────────────────────────────────
  const filteredPeriods = useMemo(() => {
    return periods.filter(
      (p) =>
        p.startDate.slice(0, 4) === String(selectedYear) ||
        p.endDate.slice(0, 4) === String(selectedYear),
    );
  }, [periods, selectedYear]);

  const showCurrentChip = useMemo(() => {
    // Always show Current if selected year is the current year
    if (selectedYear === currentYear) return true;
    // Also show if config startDate falls in the selected year
    if (config?.startDate?.slice(0, 4) === String(selectedYear)) return true;
    return false;
  }, [selectedYear, currentYear, config]);

  // ── Available months filtered by selected year ──────────────────────────────
  const availableMonths = useMemo(() => {
    const seen = new Set<string>();
    const allTxs = [...transactions];
    for (const p of periods) allTxs.push(...p.transactions);
    for (const tx of allTxs) {
      seen.add(tx.date.slice(0, 7));
    }
    return Array.from(seen)
      .filter((m) => m.startsWith(String(selectedYear)))
      .sort()
      .reverse();
  }, [transactions, periods, selectedYear]);

  // ── Auto-reset selections when year changes ─────────────────────────────────
  const prevYearRef = useRef<number>(selectedYear);
  useEffect(() => {
    const prevYear = prevYearRef.current;
    prevYearRef.current = selectedYear;
    // Only run reset logic when year actually changes
    if (prevYear === selectedYear) return;
    if (durationMode === "period") {
      if (selectedPeriodId !== "current") {
        const stillVisible = filteredPeriods.some(
          (p) => p.id === selectedPeriodId,
        );
        if (!stillVisible) {
          setSelectedPeriodId(
            showCurrentChip ? "current" : (filteredPeriods[0]?.id ?? "current"),
          );
        }
      }
    } else {
      if (availableMonths.length > 0) {
        setSelectedMonth(availableMonths[0]);
      } else {
        setSelectedMonth(
          `${selectedYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
        );
      }
    }
  }, [
    selectedYear,
    durationMode,
    selectedPeriodId,
    filteredPeriods,
    showCurrentChip,
    availableMonths,
  ]);

  // ── Duration-filtered transactions ─────────────────────────────────────────
  const durationTxs = useMemo(() => {
    if (durationMode === "period") {
      if (selectedPeriodId === "current") return currentTransactions;
      const p = periods.find((p) => p.id === selectedPeriodId);
      return p ? p.transactions : [];
    }
    // month mode
    try {
      const [y, m] = selectedMonth.split("-").map(Number);
      const monthDate = new Date(y, m - 1, 1);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      // Search across all transactions (current + archived)
      const allTxs: typeof transactions = [];
      const seen = new Set<string>();
      for (const tx of transactions) {
        if (!seen.has(tx.id)) {
          seen.add(tx.id);
          allTxs.push(tx);
        }
      }
      for (const period of periods) {
        for (const tx of period.transactions) {
          if (!seen.has(tx.id)) {
            seen.add(tx.id);
            allTxs.push(tx);
          }
        }
      }
      return allTxs.filter((tx) => {
        const d = parseISO(tx.date);
        return isWithinInterval(d, { start, end });
      });
    } catch {
      return [];
    }
  }, [
    durationMode,
    selectedPeriodId,
    selectedMonth,
    currentTransactions,
    periods,
    transactions,
  ]);

  // ── Duration label for header ───────────────────────────────────────────────
  const durationLabel = useMemo(() => {
    if (durationMode === "period") {
      if (selectedPeriodId === "current") {
        return config
          ? `${format(parseISO(config.startDate), "MMM d")} – ${format(parseISO(currentPeriodEnd), "MMM d, yyyy")}`
          : "Current Period";
      }
      const p = periods.find((p) => p.id === selectedPeriodId);
      return p
        ? `${format(parseISO(p.startDate), "MMM d")} – ${format(parseISO(p.endDate), "MMM d, yyyy")}`
        : "";
    }
    try {
      const [y, m] = selectedMonth.split("-").map(Number);
      return format(new Date(y, m - 1, 1), "MMMM yyyy");
    } catch {
      return selectedMonth;
    }
  }, [
    durationMode,
    selectedPeriodId,
    selectedMonth,
    config,
    currentPeriodEnd,
    periods,
  ]);

  // ── YTD computed data ───────────────────────────────────────────────────────
  const ytdData = useMemo(() => {
    const txs = durationTxs;
    const incomeTotal = txs
      .filter(
        (t) =>
          t.type === "income" &&
          t.mainCategory !== "Transfer" &&
          !t.isOpeningBalance,
      )
      .reduce((s, t) => s + t.amount, 0);

    // Income breakdown by source chip
    const incomeBySource = txs
      .filter(
        (t) =>
          t.type === "income" &&
          t.mainCategory !== "Transfer" &&
          !t.isOpeningBalance,
      )
      .reduce(
        (acc, t) => {
          const key = t.subCategory || "Other";
          acc[key] = (acc[key] || 0) + t.amount;
          return acc;
        },
        {} as Record<string, number>,
      );

    const categoryTotals = customCategories.map((cat) => {
      const total = txs
        .filter((t) => t.type === "expense" && t.mainCategory === cat.name)
        .reduce((s, t) => s + t.amount, 0);
      const pctOfIncome = incomeTotal > 0 ? (total / incomeTotal) * 100 : 0;
      const subTotals = cat.subCategories.map((sub) => {
        const subTotal = txs
          .filter((t) => t.type === "expense" && t.subCategory === sub.name)
          .reduce((s, t) => s + t.amount, 0);
        const subPct = incomeTotal > 0 ? (subTotal / incomeTotal) * 100 : 0;
        return { sub, total: subTotal, pctOfIncome: subPct };
      });
      return { cat, total, pctOfIncome, subTotals };
    });

    return { incomeTotal, incomeBySource, categoryTotals };
  }, [durationTxs, customCategories]);

  // ── Comparison / trend data (uses current period only, unchanged) ───────────
  const comparisonData = useMemo(() => {
    const lastPeriod = periods[0];
    return customCategories.map((cat) => ({
      name: cat.name,
      [t("thisPeriod")]: getSpentForCategory(cat.name, currentTransactions),
      [t("lastPeriod")]: lastPeriod
        ? lastPeriod.transactions
            .filter(
              (tx) => tx.mainCategory === cat.name && tx.type === "expense",
            )
            .reduce((s, tx) => s + tx.amount, 0)
        : 0,
      color: cat.color,
    }));
  }, [customCategories, currentTransactions, periods, getSpentForCategory, t]);

  const trendData = useMemo(() => {
    const historicalPeriods = [...periods].reverse().map((p) => {
      const entry: Record<string, string | number> = {
        label: format(parseISO(p.startDate), "MMM yy"),
        total: p.transactions
          .filter((tx) => tx.type === "expense")
          .reduce((s, tx) => s + tx.amount, 0),
      };
      for (const cat of customCategories) {
        entry[cat.name.toLowerCase()] = p.transactions
          .filter((tx) => tx.mainCategory === cat.name && tx.type === "expense")
          .reduce((s, tx) => s + tx.amount, 0);
      }
      return entry;
    });
    const currentEntry: Record<string, string | number> = {
      label: config ? format(parseISO(config.startDate), "MMM yy") : "Now",
      total: currentTransactions
        .filter((tx) => tx.type === "expense")
        .reduce((s, tx) => s + tx.amount, 0),
    };
    for (const cat of customCategories) {
      currentEntry[cat.name.toLowerCase()] = getSpentForCategory(
        cat.name,
        currentTransactions,
      );
    }
    return [...historicalPeriods, currentEntry];
  }, [
    periods,
    customCategories,
    currentTransactions,
    getSpentForCategory,
    config,
  ]);

  // ── Insights (current period only) ─────────────────────────────────────────
  const insights = useMemo(() => {
    const items: string[] = [];
    for (const cat of customCategories) {
      const spent = getSpentForCategory(cat.name, currentTransactions);
      const budget = getBudgetForCategory(cat.name);
      const diff = budget - spent;
      if (diff > 0) {
        items.push(
          `${cat.name} is ${formatAmount(diff, currency)} ${t("underBudget")}`,
        );
      } else if (diff < 0) {
        items.push(
          `${cat.name} is ${formatAmount(Math.abs(diff), currency)} ${t("overBudget")} ⚠️`,
        );
      }
    }
    for (const cat of customCategories) {
      for (const sub of cat.subCategories) {
        if (!sub.pct || sub.pct === 0) continue;
        const subBudget = getBudgetForSubCategory(cat.name, sub.name);
        if (subBudget <= 0) continue;
        const subSpent = getSpentForSubCategory(sub.name, currentTransactions);
        if (subSpent > subBudget) {
          const over = subSpent - subBudget;
          items.push(
            `${sub.name} is ${formatAmount(over, currency)} over budget ⚠️`,
          );
        }
      }
    }
    const allSubs = customCategories.flatMap((c) => c.subCategories);
    const subSpends = allSubs
      .map((sub) => ({
        name: sub.name,
        amount: currentTransactions
          .filter((tx) => tx.subCategory === sub.name && tx.type === "expense")
          .reduce((s, tx) => s + tx.amount, 0),
      }))
      .sort((a, b) => b.amount - a.amount);
    if (subSpends[0]?.amount > 0) {
      items.push(
        `${t("topSpend")}: ${subSpends[0].name} (${formatAmount(subSpends[0].amount, currency)})`,
      );
    }
    return items;
  }, [
    customCategories,
    currentTransactions,
    getBudgetForCategory,
    getBudgetForSubCategory,
    getSpentForCategory,
    getSpentForSubCategory,
    currency,
    t,
  ]);

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "oklch(var(--card))",
      border: "1px solid oklch(var(--border))",
      borderRadius: 8,
    },
    labelStyle: { color: "oklch(var(--foreground))" },
    itemStyle: { color: "oklch(var(--muted-foreground))" },
  };

  // ── Selected category data ──────────────────────────────────────────────────
  const activeCatData = selectedCategory
    ? ytdData.categoryTotals.find((c) => c.cat.name === selectedCategory)
    : null;

  return (
    <div className="pb-24 fade-in">
      <Tabs defaultValue="reports" className="w-full">
        <div
          className="sticky top-0 z-20 px-4 pt-2 pb-2 border-b border-border"
          style={{ backgroundColor: "oklch(var(--background))" }}
        >
          <div className="flex items-center gap-2">
            <TabsList className="flex-1">
              <TabsTrigger
                value="reports"
                className="flex-1"
                data-ocid="reports.reports.tab"
              >
                {t("reports")}
              </TabsTrigger>
              <TabsTrigger
                value="recurring"
                className="flex-1"
                data-ocid="reports.recurring.tab"
              >
                Recurring
              </TabsTrigger>
            </TabsList>
            <HelpSheet section="reports" language={config?.language ?? "en"} />
          </div>
        </div>

        <TabsContent value="reports" className="px-4 pt-4 mt-0">
          {/* ── Summary Section (filterable) ───────────────────────────── */}
          <div
            className="rounded-2xl border border-border p-4 mb-5"
            style={{ backgroundColor: "oklch(var(--card))" }}
            data-ocid="reports.ytd.card"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Summary
              </h2>
              <span className="text-xs text-muted-foreground">
                {durationLabel}
              </span>
            </div>

            {/* Year picker */}
            <div
              className="flex gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-none"
              data-ocid="reports.year_picker.row"
            >
              {availableYears.map((yr) => (
                <button
                  type="button"
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                  style={{
                    backgroundColor:
                      selectedYear === yr
                        ? "oklch(var(--foreground))"
                        : "oklch(var(--secondary))",
                    color:
                      selectedYear === yr
                        ? "oklch(var(--background))"
                        : "oklch(var(--muted-foreground))",
                    borderColor:
                      selectedYear === yr
                        ? "oklch(var(--foreground))"
                        : "oklch(var(--border))",
                  }}
                  data-ocid="reports.year.toggle"
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* Duration mode toggle */}
            <div className="flex gap-1 mb-3 p-0.5 rounded-lg bg-muted">
              <button
                type="button"
                onClick={() => {
                  setDurationMode("period");
                }}
                className="flex-1 py-1 text-xs font-medium rounded-md transition-all"
                style={{
                  backgroundColor:
                    durationMode === "period"
                      ? "oklch(var(--card))"
                      : "transparent",
                  color:
                    durationMode === "period"
                      ? "oklch(var(--foreground))"
                      : "oklch(var(--muted-foreground))",
                  boxShadow:
                    durationMode === "period"
                      ? "0 1px 3px oklch(0 0 0 / 0.15)"
                      : "none",
                }}
              >
                By Period
              </button>
              <button
                type="button"
                onClick={() => {
                  setDurationMode("month");
                }}
                className="flex-1 py-1 text-xs font-medium rounded-md transition-all"
                style={{
                  backgroundColor:
                    durationMode === "month"
                      ? "oklch(var(--card))"
                      : "transparent",
                  color:
                    durationMode === "month"
                      ? "oklch(var(--foreground))"
                      : "oklch(var(--muted-foreground))",
                  boxShadow:
                    durationMode === "month"
                      ? "0 1px 3px oklch(0 0 0 / 0.15)"
                      : "none",
                }}
              >
                By Month
              </button>
            </div>

            {/* Period picker — filtered by selected year */}
            {durationMode === "period" && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-none">
                {showCurrentChip && (
                  <button
                    type="button"
                    onClick={() => setSelectedPeriodId("current")}
                    className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                    style={{
                      backgroundColor:
                        selectedPeriodId === "current"
                          ? "oklch(var(--primary))"
                          : "oklch(var(--secondary))",
                      color:
                        selectedPeriodId === "current"
                          ? "oklch(var(--primary-foreground))"
                          : "oklch(var(--foreground))",
                      borderColor:
                        selectedPeriodId === "current"
                          ? "oklch(var(--primary))"
                          : "oklch(var(--border))",
                    }}
                  >
                    Current
                  </button>
                )}
                {filteredPeriods.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setSelectedPeriodId(p.id)}
                    className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                    style={{
                      backgroundColor:
                        selectedPeriodId === p.id
                          ? "oklch(var(--primary))"
                          : "oklch(var(--secondary))",
                      color:
                        selectedPeriodId === p.id
                          ? "oklch(var(--primary-foreground))"
                          : "oklch(var(--foreground))",
                      borderColor:
                        selectedPeriodId === p.id
                          ? "oklch(var(--primary))"
                          : "oklch(var(--border))",
                    }}
                  >
                    {format(parseISO(p.startDate), "MMM d")}–
                    {format(parseISO(p.endDate), "MMM d")}
                  </button>
                ))}
                {!showCurrentChip && filteredPeriods.length === 0 && (
                  <p className="text-xs text-muted-foreground py-1">
                    No periods in {selectedYear}
                  </p>
                )}
              </div>
            )}

            {/* Month picker — filtered by selected year */}
            {durationMode === "month" && (
              <div className="mb-3">
                {availableMonths.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No transaction data for {selectedYear}
                  </p>
                ) : (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {availableMonths.map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setSelectedMonth(m)}
                        className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                        style={{
                          backgroundColor:
                            selectedMonth === m
                              ? "oklch(var(--primary))"
                              : "oklch(var(--secondary))",
                          color:
                            selectedMonth === m
                              ? "oklch(var(--primary-foreground))"
                              : "oklch(var(--foreground))",
                          borderColor:
                            selectedMonth === m
                              ? "oklch(var(--primary))"
                              : "oklch(var(--border))",
                        }}
                      >
                        {format(
                          new Date(
                            Number(m.split("-")[0]),
                            Number(m.split("-")[1]) - 1,
                            1,
                          ),
                          "MMM yy",
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Category filter chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                style={{
                  backgroundColor:
                    selectedCategory === null
                      ? "oklch(var(--foreground))"
                      : "oklch(var(--secondary))",
                  color:
                    selectedCategory === null
                      ? "oklch(var(--background))"
                      : "oklch(var(--foreground))",
                  borderColor:
                    selectedCategory === null
                      ? "oklch(var(--foreground))"
                      : "oklch(var(--border))",
                }}
              >
                All
              </button>
              {/* Income chip */}
              <button
                type="button"
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === "__income__" ? null : "__income__",
                  )
                }
                className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                style={{
                  backgroundColor:
                    selectedCategory === "__income__"
                      ? "#20D18A"
                      : "oklch(var(--secondary))",
                  color:
                    selectedCategory === "__income__"
                      ? "#000"
                      : "oklch(var(--foreground))",
                  borderColor:
                    selectedCategory === "__income__"
                      ? "#20D18A"
                      : "oklch(var(--border))",
                }}
              >
                Income
              </button>
              {customCategories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === cat.name ? null : cat.name,
                    )
                  }
                  className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                  style={{
                    backgroundColor:
                      selectedCategory === cat.name
                        ? cat.color
                        : "oklch(var(--secondary))",
                    color:
                      selectedCategory === cat.name
                        ? "#fff"
                        : "oklch(var(--foreground))",
                    borderColor:
                      selectedCategory === cat.name
                        ? cat.color
                        : "oklch(var(--border))",
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Data grid */}
            {ytdData.incomeTotal === 0 && durationTxs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No transactions in this period. Log some to see the summary.
              </p>
            ) : selectedCategory === null ? (
              /* All-categories overview */
              <div className="grid grid-cols-2 gap-2">
                {/* Income total — full width, tappable */}
                <button
                  type="button"
                  onClick={() => setSelectedCategory("__income__")}
                  className="rounded-xl p-3 col-span-2 text-left transition-all active:scale-95"
                  style={{
                    backgroundColor: "#20D18A18",
                    border: "1px solid #20D18A44",
                  }}
                  data-ocid="reports.ytd_income.card"
                >
                  <p className="text-[10px] text-muted-foreground mb-0.5">
                    Total Income
                  </p>
                  <p
                    className="text-base font-bold"
                    style={{ color: "#20D18A" }}
                  >
                    {formatAmount(ytdData.incomeTotal, currency)}
                  </p>
                  <p
                    className="text-[10px] mt-0.5"
                    style={{ color: "#20D18A" }}
                  >
                    Tap to see breakdown →
                  </p>
                </button>
                {/* Per category — tappable to drill down */}
                {ytdData.categoryTotals.map(({ cat, total, pctOfIncome }) => (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className="rounded-xl p-3 text-left transition-all active:scale-95"
                    style={{
                      backgroundColor: `${cat.color}18`,
                      border: `1px solid ${cat.color}44`,
                    }}
                    data-ocid="reports.ytd_cat.card"
                  >
                    <p
                      className="text-[10px] font-semibold mb-0.5 truncate"
                      style={{ color: cat.color }}
                    >
                      {cat.name}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {formatAmount(total, currency)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {pctOfIncome.toFixed(1)}% of income
                    </p>
                    <p
                      className="text-[10px] mt-0.5"
                      style={{ color: cat.color }}
                    >
                      Tap to drill down →
                    </p>
                  </button>
                ))}
              </div>
            ) : selectedCategory === "__income__" ? (
              /* Income drill-down */
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: "#20D18A" }}
                    >
                      Income Breakdown
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total: {formatAmount(ytdData.incomeTotal, currency)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs text-muted-foreground underline"
                  >
                    ← Back
                  </button>
                </div>
                {Object.keys(ytdData.incomeBySource).length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No income logged in this period
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(
                      Object.entries(ytdData.incomeBySource) as [
                        string,
                        number,
                      ][]
                    )
                      .sort((a, b) => b[1] - a[1])
                      .map(([source, total]) => {
                        const pct =
                          ytdData.incomeTotal > 0
                            ? (total / ytdData.incomeTotal) * 100
                            : 0;
                        const maxVal = Math.max(
                          ...Object.values(ytdData.incomeBySource),
                          1,
                        );
                        const barPct = (total / maxVal) * 100;
                        return (
                          <div
                            key={source}
                            className="rounded-xl p-3 border border-border"
                            style={{
                              backgroundColor: "oklch(var(--background))",
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-foreground">
                                {source}
                              </span>
                              <span
                                className="text-xs font-bold"
                                style={{ color: "#20D18A" }}
                              >
                                {formatAmount(total, currency)}
                              </span>
                            </div>
                            <div
                              className="h-1.5 rounded-full mb-1"
                              style={{ backgroundColor: "oklch(var(--muted))" }}
                            >
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${barPct}%`,
                                  backgroundColor: "#20D18A",
                                }}
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {pct.toFixed(1)}% of total income
                            </p>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            ) : activeCatData ? (
              /* Subcategory drill-down for selected category */
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: activeCatData.cat.color }}
                    >
                      {activeCatData.cat.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total: {formatAmount(activeCatData.total, currency)}
                      {ytdData.incomeTotal > 0 &&
                        ` · ${activeCatData.pctOfIncome.toFixed(1)}% of income`}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {activeCatData.subTotals.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No subcategories
                    </p>
                  ) : (
                    activeCatData.subTotals.map(
                      ({ sub, total: subTotal, pctOfIncome: subPct }) => {
                        const subColor = sub.color ?? activeCatData.cat.color;
                        const maxTotal = Math.max(
                          ...activeCatData.subTotals.map((s) => s.total),
                          1,
                        );
                        const barPct = (subTotal / maxTotal) * 100;
                        return (
                          <div
                            key={sub.id}
                            className="rounded-xl p-3 border border-border"
                            style={{
                              backgroundColor: "oklch(var(--background))",
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-foreground">
                                {sub.name}
                              </span>
                              <span
                                className="text-xs font-bold"
                                style={{ color: subColor }}
                              >
                                {formatAmount(subTotal, currency)}
                              </span>
                            </div>
                            <div
                              className="h-1.5 rounded-full mb-1"
                              style={{ backgroundColor: "oklch(var(--muted))" }}
                            >
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${barPct}%`,
                                  backgroundColor: subColor,
                                }}
                              />
                            </div>
                            {ytdData.incomeTotal > 0 && (
                              <p className="text-[10px] text-muted-foreground">
                                {subPct.toFixed(1)}% of income
                              </p>
                            )}
                          </div>
                        );
                      },
                    )
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">
                {t("insights")}
              </h2>
              <div className="space-y-2">
                {insights.map((insight) => (
                  <div
                    key={insight}
                    className="p-3 rounded-xl text-sm font-medium border border-border"
                    style={{
                      backgroundColor: "oklch(var(--card))",
                      color: "oklch(var(--foreground))",
                    }}
                  >
                    💡 {insight}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Period Comparison */}
          <div
            className="rounded-2xl border border-border p-4 mb-4"
            style={{ backgroundColor: "oklch(var(--card))" }}
          >
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              {t("periodComparison")}
            </h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} barGap={4}>
                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 11,
                      fill: "oklch(var(--muted-foreground))",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fontSize: 10,
                      fill: "oklch(var(--muted-foreground))",
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                    tickFormatter={(v: number) =>
                      currency === "PHP"
                        ? `₱${(v / 1000).toFixed(0)}k`
                        : `${(v / 1000).toFixed(0)}k`
                    }
                  />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v: number) => formatAmount(v, currency)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey={t("thisPeriod")}
                    fill={customCategories[0]?.color ?? "#20D18A"}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey={t("lastPeriod")}
                    fill={customCategories[1]?.color ?? "#19B7C6"}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Spending Trends */}
          <div
            className="rounded-2xl border border-border p-4 mb-4"
            style={{ backgroundColor: "oklch(var(--card))" }}
          >
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              {t("spendingTrends")}
            </h2>
            {trendData.length < 2 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Add more periods to see trends
              </p>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid
                      stroke="oklch(var(--border))"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 10,
                        fill: "oklch(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "oklch(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={45}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v: number) => formatAmount(v, currency)}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {customCategories.map((cat) => (
                      <Line
                        key={cat.id}
                        type="monotone"
                        dataKey={cat.name.toLowerCase()}
                        stroke={cat.color}
                        dot={false}
                        strokeWidth={2}
                        name={cat.name}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recurring" className="mt-0">
          <Recurring />
        </TabsContent>
      </Tabs>
    </div>
  );
}
