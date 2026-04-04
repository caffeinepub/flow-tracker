import { Progress } from "@/components/ui/progress";
import { addMonths, format, parseISO } from "date-fns";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  HandCoins,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Tab } from "../components/BottomNav";
import { CategoryIcon } from "../components/CategoryIcon";
import { formatAmount } from "../data/categories";
import { useFinanceData } from "../hooks/useFinanceData";
import { useTranslation } from "../hooks/useTranslation";

interface DashboardProps {
  onNavigate?: (tab: Tab) => void;
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

export function Dashboard({ onNavigate }: DashboardProps) {
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
  } = useFinanceData();

  const currency = config?.currency ?? "PHP";
  const ccAlerts = getCCAlerts();
  const [showAllGoals, setShowAllGoals] = useState(false);
  const [dismissedExpiry, setDismissedExpiry] = useState(false);

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

  const pieData = useMemo(() => {
    return customCategories.map((cat) => ({
      name: cat.name,
      value: getBudgetForCategory(cat.name),
      color: cat.color,
    }));
  }, [customCategories, getBudgetForCategory]);

  const periodLabel = config
    ? `${format(parseISO(config.startDate), "MMM d")} - ${format(parseISO(currentPeriodEnd), "MMM d, yyyy")}`
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
        const saved = goal.currentSaved ?? 0;
        const rem = Math.max(0, goal.targetAmount - saved);
        const progressPct =
          goal.targetAmount > 0
            ? Math.min(100, (saved / goal.targetAmount) * 100)
            : 0;
        const monthsToReach =
          rem <= 0 ? 0 : monthly > 0 ? Math.ceil(rem / monthly) : null;
        return {
          goal,
          saved,
          remaining: rem,
          progressPct,
          monthly,
          monthsToReach,
        };
      });
  }, [goals, allSubsForGoals, projectionSettings.monthlyIncome]);

  const visibleGoalCards = showAllGoals
    ? goalCards
    : goalCards.slice(0, GOAL_PREVIEW_COUNT);

  const hasGoals = goalCards.length > 0;

  return (
    <div className="pb-24 fade-in">
      <div className="px-4 py-3">
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </div>

      {/* Period Expired Banner */}
      {isPeriodExpired && !dismissedExpiry && (
        <div className="px-4 mb-3">
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

      {/* CC Alerts Banner */}
      {ccAlerts.length > 0 && (
        <div className="px-4 mb-3">
          <button
            type="button"
            className="w-full flex items-center gap-2 p-3 rounded-xl border text-left"
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

      {/* IOU Summary chip */}
      {totalIOUsOwed > 0 && (
        <div className="px-4 mb-3">
          <button
            type="button"
            className="w-full flex items-center gap-2 p-3 rounded-xl border text-left"
            style={{
              backgroundColor: "#20D18A0D",
              borderColor: "#20D18A44",
            }}
            onClick={() => onNavigate?.("accounts")}
            data-ocid="dashboard.iou_summary.card"
          >
            <HandCoins
              size={14}
              style={{ color: "#20D18A" }}
              className="flex-shrink-0"
            />
            <span
              className="text-xs font-semibold"
              style={{ color: "#20D18A" }}
            >
              {formatAmount(totalIOUsOwed, currency)} owed to you
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              View IOUs &rarr;
            </span>
          </button>
        </div>
      )}

      <div className="px-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Budget Breakdown Donut */}
        <div
          className="rounded-2xl border border-border"
          style={{ backgroundColor: "oklch(var(--card))" }}
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
                        backgroundColor: "oklch(var(--card))",
                        border: "1px solid oklch(var(--border))",
                        borderRadius: 8,
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
                        {formatAmount(getBudgetForCategory(cat.name), currency)}
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

        {/* Period Summary */}
        <div
          className="rounded-2xl border border-border"
          style={{ backgroundColor: "oklch(var(--card))" }}
        >
          <button
            type="button"
            className="w-full flex items-center justify-between p-4"
            onClick={() => toggleSection("periodSummary")}
            data-ocid="dashboard.period_summary.toggle"
          >
            <h2 className="font-semibold text-sm text-muted-foreground">
              {t("periodSummary")}
            </h2>
            {isCollapsed("periodSummary") ? (
              <ChevronRight size={14} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={14} className="text-muted-foreground" />
            )}
          </button>
          {!isCollapsed("periodSummary") && (
            <div className="space-y-3 px-4 pb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {t("totalIncome")}
                </span>
                <span className="font-semibold text-success">
                  {formatAmount(totalIncome, currency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {t("totalExpenses")}
                </span>
                <span
                  className="font-semibold"
                  style={{
                    color:
                      totalExpenses > 0
                        ? "#EB5757"
                        : "oklch(var(--foreground))",
                  }}
                >
                  {formatAmount(totalExpenses, currency)}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">
                  {t("remaining")}
                </span>
                <span
                  className="font-bold text-lg"
                  style={{
                    color: remaining >= 0 ? "oklch(var(--primary))" : "#EB5757",
                  }}
                >
                  {formatAmount(remaining, currency)}
                </span>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{t("periodProgress")}</span>
                  <span>{Math.round(periodProgress)}%</span>
                </div>
                <div
                  className="h-1.5 rounded-full"
                  style={{ backgroundColor: "oklch(var(--muted))" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${periodProgress}%`,
                      backgroundColor: "oklch(var(--primary))",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Financial Goals Section */}
      {hasGoals && (
        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={14} style={{ color: "oklch(var(--primary))" }} />
              <h2 className="font-semibold text-sm text-muted-foreground">
                Financial Goals
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-xs"
                style={{ color: "oklch(var(--primary))" }}
                onClick={() => onNavigate?.("projections")}
                data-ocid="dashboard.goals.link"
              >
                View →
              </button>
              <button
                type="button"
                onClick={() => toggleSection("goalProgress")}
                className="text-muted-foreground"
                data-ocid="dashboard.goals.toggle"
              >
                {isCollapsed("goalProgress") ? (
                  <ChevronRight size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
            </div>
          </div>
          {!isCollapsed("goalProgress") && (
            <>
              <div
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                data-ocid="dashboard.goals.list"
              >
                {visibleGoalCards.map(
                  (
                    {
                      goal,
                      remaining: rem,
                      progressPct,
                      monthly,
                      monthsToReach,
                    },
                    idx,
                  ) => {
                    const reachDate =
                      monthsToReach !== null && monthsToReach > 0
                        ? addMonths(new Date(), monthsToReach)
                        : null;
                    return (
                      <div
                        key={goal.id}
                        className="rounded-xl border border-border p-3"
                        style={{ backgroundColor: "oklch(var(--card))" }}
                        data-ocid={`dashboard.goal.item.${idx + 1}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {goal.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {goal.subCategoryName}
                            </p>
                          </div>
                          <span
                            className="text-xs font-bold flex-shrink-0"
                            style={{ color: "oklch(var(--primary))" }}
                          >
                            {Math.round(progressPct)}%
                          </span>
                        </div>
                        <Progress value={progressPct} className="h-1.5 mb-2" />
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-muted-foreground">
                            {rem > 0
                              ? `${formatAmount(rem, currency)} to go`
                              : "\uD83C\uDF89 Goal reached!"}
                          </span>
                          {reachDate && monthly > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              ~{monthsToReach}mo ({format(reachDate, "MMM yy")})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
              {goalCards.length > GOAL_PREVIEW_COUNT && (
                <button
                  type="button"
                  className="w-full mt-2 py-2 text-xs flex items-center justify-center gap-1"
                  style={{ color: "oklch(var(--primary))" }}
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

      {/* Category Spending */}
      <div className="px-4 mt-6">
        <button
          type="button"
          className="w-full flex items-center justify-between mb-3"
          onClick={() => toggleSection("categorySpending")}
          data-ocid="dashboard.category_spending.toggle"
        >
          <h2 className="font-semibold text-sm text-muted-foreground">
            {t("categorySpending")}
          </h2>
          {isCollapsed("categorySpending") ? (
            <ChevronRight size={14} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={14} className="text-muted-foreground" />
          )}
        </button>
        {!isCollapsed("categorySpending") && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    className="flex items-center gap-3 rounded-xl border border-border p-3"
                    style={{ backgroundColor: "oklch(var(--card))" }}
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
                          {formatAmount(spent, currency)}
                        </span>
                      </div>
                      <div
                        className="mt-1 h-1 rounded-full"
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
                        {t("budget")}: {formatAmount(budget, currency)}
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
