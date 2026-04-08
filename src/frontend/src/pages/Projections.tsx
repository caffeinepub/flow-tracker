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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addMonths, format } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { HelpSheet } from "../components/HelpSheet";
import { formatAmount } from "../data/categories";
import { useFinanceData } from "../hooks/useFinanceData";
import type { Goal } from "../types";

type TimeRange = "6m" | "1y" | "5y" | "custom";

function calcFV(pmt: number, annualRate: number, months: number): number {
  if (annualRate === 0) return pmt * months;
  const r = annualRate / 100 / 12;
  return pmt * (((1 + r) ** months - 1) / r);
}

function getMonthsForRange(range: TimeRange, customMonths: number): number {
  if (range === "6m") return 6;
  if (range === "1y") return 12;
  if (range === "5y") return 60;
  return customMonths;
}

// Filter key encoding: "all" | "cat:CatName" | "sub:CatName:SubName"
type FilterKey = string;

interface ProjectionsProps {
  privacyMode?: boolean;
}

export function Projections({ privacyMode = false }: ProjectionsProps) {
  const {
    config,
    customCategories,
    getBudgetForSubCategory,
    getBudgetForCategory,
    goals,
    addGoalWithAccount,
    updateGoalWithAccount,
    deleteGoal,
    projectionSettings,
    updateProjectionSettings,
    accounts,
    transactions,
  } = useFinanceData();

  const currency = config?.currency ?? "PHP";
  const pAmt = (val: number) =>
    privacyMode ? "••••••" : formatAmount(val, currency);
  const defaultSalary = config?.salary ?? 19000;

  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [customMonths, setCustomMonths] = useState(18);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const PROJ_COLLAPSE_KEY = "flow_projections_sections";
  const [projCollapsed, setProjCollapsed] = useState<Record<string, boolean>>(
    () => {
      try {
        return JSON.parse(localStorage.getItem(PROJ_COLLAPSE_KEY) ?? "{}");
      } catch {
        return {};
      }
    },
  );
  const toggleProjSection = (key: string) => {
    setProjCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(PROJ_COLLAPSE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const isProjCollapsed = (key: string) => !!projCollapsed[key];

  const [editGoalForm, setEditGoalForm] = useState<{
    subCategoryId: string;
    subCategoryName: string;
    targetAmount: string;
    currentSaved: string;
    label: string;
    startDate: string;
  }>({
    subCategoryId: "",
    subCategoryName: "",
    targetAmount: "",
    currentSaved: "",
    label: "",
    startDate: "",
  });
  const [filterKey, setFilterKey] = useState<FilterKey>("all");
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const [goalForm, setGoalForm] = useState<{
    subCategoryId: string;
    subCategoryName: string;
    targetAmount: string;
    currentSaved: string;
    label: string;
    startDate: string;
  }>({
    subCategoryId: "",
    subCategoryName: "",
    targetAmount: "",
    currentSaved: "",
    label: "",
    startDate: new Date().toISOString().split("T")[0],
  });

  // Account pickers for Add / Edit goal dialogs
  const [goalAccountId, setGoalAccountId] = useState<string>("__none__");
  const [editGoalAccountId, setEditGoalAccountId] =
    useState<string>("__none__");

  // Local scenario sliders (separate from saved settings)
  const [scenarioIncome, setScenarioIncome] = useState(
    projectionSettings.monthlyIncome,
  );
  const [scenarioRate, setScenarioRate] = useState(
    projectionSettings.returnRatePct,
  );

  const months = getMonthsForRange(timeRange, customMonths);

  // Find savings and investments monthly amounts (for "all" view)
  const savingsCat = customCategories.find((c) =>
    c.name.toLowerCase().includes("saving"),
  );
  const investmentsSub = customCategories
    .flatMap((c) => c.subCategories.map((s) => ({ cat: c, sub: s })))
    .find(({ sub }) => sub.name.toLowerCase().includes("invest"));

  const salaryRatio = scenarioIncome / (defaultSalary || 1);

  const monthlySavings = savingsCat
    ? getBudgetForCategory(savingsCat.name) * salaryRatio
    : 0;
  const monthlyInvestments = investmentsSub
    ? getBudgetForSubCategory(
        investmentsSub.cat.name,
        investmentsSub.sub.name,
      ) * salaryRatio
    : 0;

  // Parse filterKey to determine what to chart
  const filterInfo = useMemo(() => {
    if (filterKey === "all") return { type: "all" as const };
    if (filterKey.startsWith("cat:")) {
      return { type: "cat" as const, catName: filterKey.slice(4) };
    }
    if (filterKey.startsWith("sub:")) {
      const parts = filterKey.slice(4).split(":");
      return {
        type: "sub" as const,
        catName: parts[0],
        subName: parts.slice(1).join(":"),
      };
    }
    return { type: "all" as const };
  }, [filterKey]);

  // Should we show the return rate slider?
  const showReturnRateSlider = useMemo(() => {
    if (filterInfo.type === "all") return true;
    if (filterInfo.type === "cat") {
      const cat = customCategories.find((c) => c.name === filterInfo.catName);
      if (!cat) return true;
      const catNameLower = cat.name.toLowerCase();
      return catNameLower.includes("saving") || catNameLower.includes("invest");
    }
    if (filterInfo.type === "sub") {
      const cat = customCategories.find((c) => c.name === filterInfo.catName);
      if (!cat) return true;
      const catNameLower = cat.name.toLowerCase();
      return catNameLower.includes("saving") || catNameLower.includes("invest");
    }
    return true;
  }, [filterInfo, customCategories]);

  // Monthly budget for the selected filter
  const filteredMonthlyBudget = useMemo(() => {
    if (filterInfo.type === "all") return null;
    if (filterInfo.type === "cat") {
      return getBudgetForCategory(filterInfo.catName) * salaryRatio;
    }
    if (filterInfo.type === "sub") {
      return (
        getBudgetForSubCategory(filterInfo.catName, filterInfo.subName) *
        salaryRatio
      );
    }
    return null;
  }, [filterInfo, getBudgetForCategory, getBudgetForSubCategory, salaryRatio]);

  const chartData = useMemo(() => {
    const now = new Date();
    if (filterInfo.type === "all") {
      const data: {
        label: string;
        savings: number;
        investments: number;
        month: number;
      }[] = [];
      for (let i = 0; i <= months; i++) {
        const date = addMonths(now, i);
        const label = format(date, i === 0 ? "'Now'" : "MMM yy");
        const savingsVal = calcFV(monthlySavings, 0, i);
        const investmentsVal = calcFV(monthlyInvestments, scenarioRate, i);
        data.push({
          label,
          savings: savingsVal,
          investments: investmentsVal,
          month: i,
        });
      }
      return data;
    }
    // Single line for cat or sub
    const useReturn = showReturnRateSlider ? scenarioRate : 0;
    const monthly = filteredMonthlyBudget ?? 0;
    const data: { label: string; amount: number; month: number }[] = [];
    for (let i = 0; i <= months; i++) {
      const date = addMonths(now, i);
      const label = format(date, i === 0 ? "'Now'" : "MMM yy");
      const amount = calcFV(monthly, useReturn, i);
      data.push({ label, amount, month: i });
    }
    return data;
  }, [
    months,
    monthlySavings,
    monthlyInvestments,
    scenarioRate,
    filterInfo,
    filteredMonthlyBudget,
    showReturnRateSlider,
  ]);

  const finalSavings =
    filterInfo.type === "all"
      ? ((chartData as { savings: number }[])[chartData.length - 1]?.savings ??
        0)
      : 0;
  const finalInvestments =
    filterInfo.type === "all"
      ? ((chartData as { investments: number }[])[chartData.length - 1]
          ?.investments ?? 0)
      : 0;
  const finalFiltered =
    filterInfo.type !== "all"
      ? ((chartData as { amount: number }[])[chartData.length - 1]?.amount ?? 0)
      : 0;

  // Sample data points for chart
  const sampledData = useMemo(() => {
    if (chartData.length <= 12) return chartData;
    const step = Math.floor(chartData.length / 12);
    return chartData.filter(
      (_, i) => i % step === 0 || i === chartData.length - 1,
    );
  }, [chartData]);

  const allSubs = customCategories.flatMap((cat) =>
    cat.subCategories.map((sub) => ({
      id: sub.id,
      name: sub.name,
      catName: cat.name,
      catColor: cat.color,
      monthlyBudget: getBudgetForSubCategory(cat.name, sub.name),
    })),
  );

  const handleAddGoal = () => {
    const amount = Number.parseFloat(goalForm.targetAmount);
    if (!goalForm.subCategoryId || !amount || amount <= 0) {
      toast.error("Select a subcategory and enter a target amount");
      return;
    }
    const label = goalForm.label.trim() || `${goalForm.subCategoryName} Goal`;
    const currentSavedVal = Number.parseFloat(goalForm.currentSaved) || 0;
    const todayStr = new Date().toISOString().split("T")[0];
    const newGoal: Omit<Goal, "id"> = {
      subCategoryId: goalForm.subCategoryId,
      subCategoryName: goalForm.subCategoryName,
      targetAmount: amount,
      label,
      currentSaved: currentSavedVal > 0 ? currentSavedVal : undefined,
      startDate: goalForm.startDate || todayStr,
    };
    addGoalWithAccount(
      newGoal,
      goalAccountId === "__none__" ? undefined : goalAccountId || undefined,
      currentSavedVal > 0 ? currentSavedVal : undefined,
    );
    setShowAddGoal(false);
    setGoalForm({
      subCategoryId: "",
      subCategoryName: "",
      targetAmount: "",
      currentSaved: "",
      label: "",
      startDate: todayStr,
    });
    setGoalAccountId("__none__");
    toast.success("Goal added!");
  };

  const handleUpdateGoal = () => {
    if (!editingGoalId) return;
    const amount = Number.parseFloat(editGoalForm.targetAmount);
    if (!editGoalForm.subCategoryId || !amount || amount <= 0) {
      toast.error("Select a subcategory and enter a target amount");
      return;
    }
    const label =
      editGoalForm.label.trim() || `${editGoalForm.subCategoryName} Goal`;
    const currentSavedVal = Number.parseFloat(editGoalForm.currentSaved) || 0;
    const todayStr = new Date().toISOString().split("T")[0];
    updateGoalWithAccount(
      editingGoalId,
      {
        subCategoryId: editGoalForm.subCategoryId,
        subCategoryName: editGoalForm.subCategoryName,
        targetAmount: amount,
        label,
        currentSaved: currentSavedVal > 0 ? currentSavedVal : undefined,
        startDate: editGoalForm.startDate || todayStr,
      },
      editGoalAccountId === "__none__"
        ? undefined
        : editGoalAccountId || undefined,
    );
    setEditingGoalId(null);
    setEditGoalAccountId("__none__");
    toast.success("Goal updated!");
  };

  const getGoalInfo = (goal: Goal) => {
    const monthly =
      allSubs.find((s) => s.id === goal.subCategoryId)?.monthlyBudget ?? 0;
    const linkedTxSum = transactions
      .filter((tx) => tx.goalId === goal.id && tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const saved = (goal.alreadySavedAmount ?? 0) + linkedTxSum;
    const remaining = Math.max(0, goal.targetAmount - saved);
    const progressPct =
      goal.targetAmount > 0
        ? Math.min(100, (saved / goal.targetAmount) * 100)
        : 0;
    if (monthly <= 0)
      return {
        monthsToReach: null,
        monthly: 0,
        reachDate: null,
        remaining,
        progressPct,
      };
    const monthsToReach = remaining <= 0 ? 0 : Math.ceil(remaining / monthly);
    const reachDate = addMonths(new Date(), monthsToReach);
    return { monthsToReach, monthly, reachDate, remaining, progressPct };
  };

  const minIncome = Math.round(defaultSalary * 0.5);
  const maxIncome = Math.round(defaultSalary * 1.5);

  // Get color for filter line
  const filterLineColor = useMemo(() => {
    if (filterInfo.type === "cat") {
      return (
        customCategories.find((c) => c.name === filterInfo.catName)?.color ??
        "oklch(var(--primary))"
      );
    }
    if (filterInfo.type === "sub") {
      const cat = customCategories.find((c) => c.name === filterInfo.catName);
      const sub = cat?.subCategories.find((s) => s.name === filterInfo.subName);
      return sub?.color ?? cat?.color ?? "oklch(var(--primary))";
    }
    return "oklch(var(--primary))";
  }, [filterInfo, customCategories]);

  const toggleSubExpand = (key: string) => {
    setExpandedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const customMonthsYears = (customMonths / 12).toFixed(1);

  return (
    <div className="pb-24 px-4 pt-2 animate-spring-in">
      {/* Monthly Income Input */}
      <div className="glass-card mb-4" data-ocid="projections.income.card">
        <button
          type="button"
          className="w-full flex items-center justify-between p-4"
          onClick={() => toggleProjSection("settings")}
          data-ocid="projections.settings.toggle"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Projection Settings
            </h2>
            <HelpSheet
              section="projections"
              language={config?.language ?? "en"}
            />
          </div>
          {isProjCollapsed("settings") ? (
            <ChevronDown size={14} className="text-muted-foreground" />
          ) : (
            <ChevronUp size={14} className="text-muted-foreground" />
          )}
        </button>
        {!isProjCollapsed("settings") && (
          <div className="space-y-4 px-4 pb-4">
            <div>
              <Label>Monthly Income for Projections</Label>
              <div className="flex items-center gap-2 mt-1">
                <div className="floating-label-group flex-1">
                  <input
                    id="proj-income"
                    type="number"
                    value={projectionSettings.monthlyIncome}
                    onChange={(e) =>
                      updateProjectionSettings({
                        monthlyIncome:
                          Number.parseFloat(e.target.value) || defaultSalary,
                      })
                    }
                    placeholder=" "
                    data-ocid="projections.income.input"
                  />
                  <label htmlFor="proj-income">
                    Monthly Income ({currency})
                  </label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Default from salary: {pAmt(defaultSalary)}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Annual Return Rate</Label>
                <span
                  className="text-sm font-bold"
                  style={{ color: "oklch(var(--primary))" }}
                >
                  {projectionSettings.returnRatePct}%
                </span>
              </div>
              <Slider
                value={[projectionSettings.returnRatePct]}
                min={1}
                max={20}
                step={0.5}
                onValueChange={([v]) =>
                  updateProjectionSettings({ returnRatePct: v })
                }
                className="mt-1"
                data-ocid="projections.return_rate.slider"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>1%</span>
                <span>Default: 7%</span>
                <span>20%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scenario Sliders */}
      <div className="glass-card mb-4" data-ocid="projections.scenario.card">
        <button
          type="button"
          className="w-full flex items-center justify-between p-4"
          onClick={() => toggleProjSection("scenario")}
          data-ocid="projections.scenario.toggle"
        >
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground">
              Scenario Sliders
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Simulation only — adjustments are temporary and not saved
            </p>
          </div>
          {isProjCollapsed("scenario") ? (
            <ChevronDown size={14} className="text-muted-foreground" />
          ) : (
            <ChevronUp size={14} className="text-muted-foreground" />
          )}
        </button>
        {!isProjCollapsed("scenario") && (
          <div className="space-y-4 px-4 pb-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <Label className="text-xs">Adjust Monthly Income</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Drag to see how a different income changes your projections
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Base: {pAmt(projectionSettings.monthlyIncome)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className="text-sm font-bold"
                    style={{ color: "oklch(var(--primary))" }}
                  >
                    {pAmt(scenarioIncome)}
                  </span>
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground underline ml-1"
                    onClick={() =>
                      setScenarioIncome(projectionSettings.monthlyIncome)
                    }
                    data-ocid="projections.scenario_income.reset"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <Slider
                value={[scenarioIncome]}
                min={minIncome}
                max={maxIncome}
                step={500}
                onValueChange={([v]) => setScenarioIncome(v)}
                data-ocid="projections.scenario_income.slider"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>{pAmt(minIncome)}</span>
                <span>{pAmt(maxIncome)}</span>
              </div>
            </div>
            {showReturnRateSlider && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <Label className="text-xs">Adjust Return Rate</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Annual interest/return rate on savings or investments
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="text-sm font-bold"
                      style={{ color: "oklch(var(--primary))" }}
                    >
                      {scenarioRate}%
                    </span>
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground underline ml-1"
                      onClick={() =>
                        setScenarioRate(projectionSettings.returnRatePct)
                      }
                      data-ocid="projections.scenario_rate.reset"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <Slider
                  value={[scenarioRate]}
                  min={1}
                  max={20}
                  step={0.5}
                  onValueChange={([v]) => setScenarioRate(v)}
                  data-ocid="projections.scenario_rate.slider"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="glass-card mb-4" data-ocid="projections.charts.card">
        <div className="flex items-center justify-between p-4 gap-2 flex-wrap">
          <button
            type="button"
            className="flex items-center gap-2"
            onClick={() => toggleProjSection("charts")}
            data-ocid="projections.charts.toggle"
          >
            <h2 className="text-sm font-semibold text-muted-foreground">
              Growth Projections
            </h2>
            {isProjCollapsed("charts") ? (
              <ChevronDown size={14} className="text-muted-foreground" />
            ) : (
              <ChevronUp size={14} className="text-muted-foreground" />
            )}
          </button>
          <Tabs
            value={timeRange}
            onValueChange={(v) => setTimeRange(v as TimeRange)}
          >
            <TabsList className="h-7">
              <TabsTrigger
                value="6m"
                className="text-xs px-2 h-6"
                data-ocid="projections.6m.tab"
              >
                6M
              </TabsTrigger>
              <TabsTrigger
                value="1y"
                className="text-xs px-2 h-6"
                data-ocid="projections.1y.tab"
              >
                1Y
              </TabsTrigger>
              <TabsTrigger
                value="5y"
                className="text-xs px-2 h-6"
                data-ocid="projections.5y.tab"
              >
                5Y
              </TabsTrigger>
              <TabsTrigger
                value="custom"
                className="text-xs px-2 h-6"
                data-ocid="projections.custom.tab"
              >
                Custom
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {!isProjCollapsed("charts") && (
          <div className="px-4 pb-4">
            {/* Custom range slider */}
            {timeRange === "custom" && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    Time Range
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "oklch(var(--primary))" }}
                  >
                    {customMonths} months ({customMonthsYears} years)
                  </span>
                </div>
                <Slider
                  value={[customMonths]}
                  min={1}
                  max={360}
                  step={1}
                  onValueChange={([v]) => setCustomMonths(v)}
                  data-ocid="projections.custom_range.slider"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>1 month</span>
                  <span>30 years</span>
                </div>
              </div>
            )}

            {/* Filter dropdown */}
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-1 block">
                View projection for:
              </Label>
              <Select value={filterKey} onValueChange={setFilterKey}>
                <SelectTrigger
                  className="h-8 text-xs"
                  data-ocid="projections.filter.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All (Savings + Investments)
                  </SelectItem>
                  {customCategories.map((cat) => (
                    <SelectGroup key={cat.id}>
                      <SelectLabel
                        className="text-xs"
                        style={{ color: cat.color }}
                      >
                        {cat.name}
                      </SelectLabel>
                      <SelectItem value={`cat:${cat.name}`}>
                        {cat.name} (Total)
                      </SelectItem>
                      {cat.subCategories.map((sub) => (
                        <SelectItem
                          key={sub.id}
                          value={`sub:${cat.name}:${sub.name}`}
                        >
                          &nbsp;&nbsp;↳ {sub.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary cards */}
            {filterInfo.type === "all" ? (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div
                  className="rounded-xl p-3"
                  style={{ backgroundColor: "oklch(var(--primary) / 0.1)" }}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <TrendingUp
                      size={12}
                      style={{ color: "oklch(var(--primary))" }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Savings
                    </span>
                  </div>
                  <p
                    className="text-sm font-bold"
                    style={{ color: "oklch(var(--primary))" }}
                  >
                    {pAmt(finalSavings)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {pAmt(monthlySavings)}/mo
                  </p>
                </div>
                <div
                  className="rounded-xl p-3"
                  style={{ backgroundColor: "oklch(0.68 0.17 195 / 0.1)" }}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <TrendingUp
                      size={12}
                      style={{ color: "oklch(0.68 0.17 195)" }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Investments
                    </span>
                  </div>
                  <p
                    className="text-sm font-bold"
                    style={{ color: "oklch(0.68 0.17 195)" }}
                  >
                    {pAmt(finalInvestments)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {scenarioRate}% annual return
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="rounded-xl p-3 mb-4"
                style={{ backgroundColor: `${filterLineColor}22` }}
              >
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp size={12} style={{ color: filterLineColor }} />
                  <span className="text-[10px] text-muted-foreground">
                    {filterInfo.type === "cat"
                      ? filterInfo.catName
                      : filterInfo.subName}
                  </span>
                </div>
                <p
                  className="text-sm font-bold"
                  style={{ color: filterLineColor }}
                >
                  {pAmt(finalFiltered)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {pAmt(filteredMonthlyBudget ?? 0)}/mo
                </p>
              </div>
            )}

            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={sampledData}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(var(--border))"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fontSize: 9,
                      fill: "oklch(var(--muted-foreground))",
                    }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{
                      fontSize: 9,
                      fill: "oklch(var(--muted-foreground))",
                    }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()
                    }
                    width={35}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      pAmt(value),
                      name.charAt(0).toUpperCase() + name.slice(1),
                    ]}
                    contentStyle={{
                      backgroundColor: "oklch(var(--card))",
                      border: "1px solid oklch(var(--border))",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  {filterInfo.type === "all" ? (
                    <>
                      <Line
                        type="monotone"
                        dataKey="savings"
                        stroke="oklch(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        name="Savings"
                      />
                      <Line
                        type="monotone"
                        dataKey="investments"
                        stroke="oklch(0.68 0.17 195)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        name="Investments"
                      />
                    </>
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke={filterLineColor}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      name={
                        filterInfo.type === "cat"
                          ? filterInfo.catName
                          : (filterInfo.subName ?? "")
                      }
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Goals */}
      <div className="glass-card mb-4" data-ocid="projections.goals.card">
        <div className="flex items-center justify-between p-4">
          <button
            type="button"
            className="flex items-center gap-2"
            onClick={() => toggleProjSection("goals")}
            data-ocid="projections.goals.toggle"
          >
            <h2 className="text-sm font-semibold text-muted-foreground">
              Financial Goals
            </h2>
            {isProjCollapsed("goals") ? (
              <ChevronDown size={14} className="text-muted-foreground" />
            ) : (
              <ChevronUp size={14} className="text-muted-foreground" />
            )}
          </button>
          <Button
            size="sm"
            className="gap-1 h-7 text-xs px-2"
            style={{
              backgroundColor: "oklch(var(--primary))",
              color: "oklch(var(--primary-foreground))",
            }}
            onClick={() => setShowAddGoal(true)}
            data-ocid="projections.goals.open_modal_button"
          >
            <Plus size={12} /> Add Goal
          </Button>
        </div>
        {!isProjCollapsed("goals") && (
          <div className="px-4 pb-4">
            {goals.length === 0 ? (
              <div
                className="text-center py-8"
                data-ocid="projections.goals.empty_state"
              >
                <Target
                  size={28}
                  className="mx-auto mb-2 text-muted-foreground"
                />
                <p className="text-sm text-muted-foreground">
                  No goals yet. Add a savings target!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {goals.map((goal, idx) => {
                  const {
                    monthsToReach,
                    monthly,
                    reachDate,
                    remaining,
                    progressPct,
                  } = getGoalInfo(goal);
                  const hasSaved = (goal.currentSaved ?? 0) > 0;
                  return (
                    <div
                      key={goal.id}
                      className="glass-card-sm card-hover p-3"
                      data-ocid={`projections.goal.item.${idx + 1}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {goal.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {goal.subCategoryName} · Target:{" "}
                            {pAmt(goal.targetAmount)}
                          </p>
                          {hasSaved && (
                            <>
                              <Progress
                                value={progressPct}
                                className="h-1.5 mt-2 mb-1"
                              />
                              <p className="text-[10px] text-muted-foreground">
                                Saved: {pAmt(goal.currentSaved ?? 0)} /{" "}
                                {pAmt(goal.targetAmount)}{" "}
                                <span
                                  style={{ color: "oklch(var(--primary))" }}
                                >
                                  ({Math.round(progressPct)}% complete)
                                </span>
                              </p>
                              {monthly > 0 &&
                              monthsToReach !== null &&
                              monthsToReach > 0 &&
                              reachDate ? (
                                <p
                                  className="text-xs mt-1"
                                  style={{ color: "oklch(var(--primary))" }}
                                >
                                  {pAmt(remaining)} remaining · reach in{" "}
                                  {monthsToReach} months (
                                  {format(reachDate, "MMM yyyy")})
                                </p>
                              ) : monthsToReach === 0 ? (
                                <p
                                  className="text-xs mt-1"
                                  style={{ color: "oklch(var(--primary))" }}
                                >
                                  🎉 Goal reached!
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Set subcategory budget to calculate timeline
                                </p>
                              )}
                            </>
                          )}
                          {!hasSaved &&
                          monthly > 0 &&
                          monthsToReach &&
                          reachDate ? (
                            <p
                              className="text-xs mt-1"
                              style={{ color: "oklch(var(--primary))" }}
                            >
                              At {pAmt(monthly)}/mo → reach in {monthsToReach}{" "}
                              months ({format(reachDate, "MMM yyyy")})
                            </p>
                          ) : !hasSaved ? (
                            <p className="text-xs text-muted-foreground mt-1">
                              Set subcategory budget to calculate timeline
                            </p>
                          ) : null}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditGoalForm({
                                subCategoryId: goal.subCategoryId,
                                subCategoryName: goal.subCategoryName,
                                targetAmount: goal.targetAmount.toString(),
                                currentSaved:
                                  goal.currentSaved?.toString() ?? "",
                                label: goal.label,
                                startDate:
                                  goal.startDate ??
                                  new Date().toISOString().split("T")[0],
                              });
                              setEditGoalAccountId(
                                goal.alreadySavedAccountId ?? "__none__",
                              );
                              setEditingGoalId(goal.id);
                            }}
                            className="p-1.5 rounded-lg flex-shrink-0"
                            style={{
                              backgroundColor: "oklch(var(--secondary))",
                              color: "oklch(var(--muted-foreground))",
                            }}
                            data-ocid={`projections.goal.edit_button.${idx + 1}`}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteGoal(goal.id)}
                            className="p-1.5 rounded-lg flex-shrink-0"
                            style={{
                              backgroundColor: "#EB575722",
                              color: "#EB5757",
                            }}
                            data-ocid={`projections.goal.delete_button.${idx + 1}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subcategory Breakdown */}
      <div
        className="glass-card mb-4"
        data-ocid="projections.sub_breakdown.card"
      >
        <button
          type="button"
          className="w-full flex items-center justify-between p-4"
          onClick={() => toggleProjSection("subBreakdown")}
          data-ocid="projections.sub_breakdown.toggle"
        >
          <h2 className="text-sm font-semibold text-muted-foreground">
            Subcategory Breakdown
          </h2>
          {isProjCollapsed("subBreakdown") ? (
            <ChevronDown size={14} className="text-muted-foreground" />
          ) : (
            <ChevronUp size={14} className="text-muted-foreground" />
          )}
        </button>
        {!isProjCollapsed("subBreakdown") && (
          <div className="px-4 pb-4 space-y-2">
            {customCategories.flatMap((cat) =>
              cat.subCategories.map((sub) => {
                const monthly =
                  getBudgetForSubCategory(cat.name, sub.name) * salaryRatio;
                const expandKey = `${cat.id}-${sub.id}`;
                const isExpanded = expandedSubs.has(expandKey);
                const goalForSub = goals.find(
                  (g) => g.subCategoryId === sub.id,
                );
                const subColor = sub.color ?? cat.color;

                // Mini chart data for expanded
                const miniData = isExpanded
                  ? (() => {
                      const useReturn =
                        cat.name.toLowerCase().includes("saving") ||
                        cat.name.toLowerCase().includes("invest")
                          ? scenarioRate
                          : 0;
                      const now = new Date();
                      const pts: { label: string; amount: number }[] = [];
                      for (
                        let i = 0;
                        i <= months;
                        i += Math.max(1, Math.floor(months / 8))
                      ) {
                        const amount = calcFV(monthly, useReturn, i);
                        pts.push({
                          label: format(
                            addMonths(now, i),
                            i === 0 ? "'Now'" : "MMM yy",
                          ),
                          amount,
                        });
                      }
                      if (
                        pts[pts.length - 1]?.label !==
                        format(addMonths(now, months), "MMM yy")
                      ) {
                        pts.push({
                          label: format(addMonths(now, months), "MMM yy"),
                          amount: calcFV(monthly, useReturn, months),
                        });
                      }
                      return pts;
                    })()
                  : [];

                return (
                  <div
                    key={expandKey}
                    className="rounded-xl border border-border overflow-hidden"
                    style={{ backgroundColor: "oklch(var(--secondary) / 0.3)" }}
                    data-ocid={`projections.sub.item.${sub.id}`}
                  >
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-3 text-left"
                      onClick={() => toggleSubExpand(expandKey)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: subColor }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {sub.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {cat.name} · {sub.pct ?? 0}% · {pAmt(monthly)}/mo
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {goalForSub && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${subColor}22`,
                              color: subColor,
                            }}
                          >
                            Goal set
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp
                            size={12}
                            className="text-muted-foreground"
                          />
                        ) : (
                          <ChevronDown
                            size={12}
                            className="text-muted-foreground"
                          />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3">
                        <div style={{ height: 80 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={miniData}
                              margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                            >
                              <XAxis
                                dataKey="label"
                                tick={{
                                  fontSize: 8,
                                  fill: "oklch(var(--muted-foreground))",
                                }}
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis
                                tick={{
                                  fontSize: 8,
                                  fill: "oklch(var(--muted-foreground))",
                                }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) =>
                                  v >= 1000
                                    ? `${(v / 1000).toFixed(0)}k`
                                    : v.toString()
                                }
                                width={28}
                              />
                              <Tooltip
                                formatter={(v: number) => [pAmt(v), sub.name]}
                                contentStyle={{
                                  backgroundColor: "oklch(var(--card))",
                                  border: "1px solid oklch(var(--border))",
                                  borderRadius: 6,
                                  fontSize: 10,
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="amount"
                                stroke={subColor}
                                strokeWidth={1.5}
                                dot={false}
                                activeDot={{ r: 3 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        {goalForSub &&
                          (() => {
                            const gi = getGoalInfo(goalForSub);
                            return (
                              <div className="mt-2 pt-2 border-t border-border">
                                <p className="text-[10px] text-muted-foreground">
                                  <span
                                    className="font-semibold"
                                    style={{ color: subColor }}
                                  >
                                    {goalForSub.label}
                                  </span>
                                  {" · "}
                                  Target: {pAmt(goalForSub.targetAmount)}
                                </p>
                                {(goalForSub.currentSaved ?? 0) > 0 && (
                                  <>
                                    <Progress
                                      value={gi.progressPct}
                                      className="h-1 mt-1"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {Math.round(gi.progressPct)}% complete
                                    </p>
                                  </>
                                )}
                                {gi.monthly > 0 &&
                                  gi.monthsToReach !== null &&
                                  gi.reachDate && (
                                    <p
                                      className="text-[10px] mt-0.5"
                                      style={{ color: subColor }}
                                    >
                                      {gi.monthsToReach > 0
                                        ? `Reach in ${gi.monthsToReach}mo (${format(gi.reachDate, "MMM yyyy")})`
                                        : "🎉 Goal reached!"}
                                    </p>
                                  )}
                              </div>
                            );
                          })()}
                      </div>
                    )}
                  </div>
                );
              }),
            )}
          </div>
        )}
      </div>

      {/* Edit Goal Dialog */}
      <Dialog
        open={!!editingGoalId}
        onOpenChange={(o) => {
          if (!o) {
            setEditingGoalId(null);
            setEditGoalAccountId("");
          }
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto"
          data-ocid="projections.edit_goal.dialog"
        >
          <DialogHeader>
            <DialogTitle>Edit Financial Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subcategory</Label>
              <Select
                value={editGoalForm.subCategoryId}
                onValueChange={(v) => {
                  const sub = allSubs.find((s) => s.id === v);
                  setEditGoalForm((prev) => ({
                    ...prev,
                    subCategoryId: v,
                    subCategoryName: sub?.name ?? "",
                  }));
                }}
              >
                <SelectTrigger
                  className="mt-1"
                  data-ocid="projections.edit_goal_sub.select"
                >
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {allSubs.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name} ({sub.catName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="floating-label-group">
              <input
                id="edit-goal-label"
                type="text"
                value={editGoalForm.label}
                onChange={(e) =>
                  setEditGoalForm((prev) => ({
                    ...prev,
                    label: e.target.value,
                  }))
                }
                placeholder=" "
                data-ocid="projections.edit_goal_label.input"
              />
              <label htmlFor="edit-goal-label">Goal Label</label>
            </div>
            <div className="floating-label-group">
              <input
                id="edit-goal-amount"
                type="number"
                value={editGoalForm.targetAmount}
                onChange={(e) =>
                  setEditGoalForm((prev) => ({
                    ...prev,
                    targetAmount: e.target.value,
                  }))
                }
                placeholder=" "
                min="0"
                data-ocid="projections.edit_goal_amount.input"
              />
              <label htmlFor="edit-goal-amount">
                Target Amount ({currency})
              </label>
            </div>
            <div>
              <div className="floating-label-group">
                <input
                  id="edit-goal-saved"
                  type="number"
                  value={editGoalForm.currentSaved}
                  onChange={(e) =>
                    setEditGoalForm((prev) => ({
                      ...prev,
                      currentSaved: e.target.value,
                    }))
                  }
                  placeholder=" "
                  min="0"
                  data-ocid="projections.edit_goal_saved.input"
                />
                <label htmlFor="edit-goal-saved">
                  Already saved (optional)
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                How much you&apos;ve already saved toward this goal
              </p>
            </div>
            {/* Account picker — always visible in edit mode */}
            <div>
              <Label>Account where this is saved (optional)</Label>
              <Select
                value={editGoalAccountId}
                onValueChange={setEditGoalAccountId}
              >
                <SelectTrigger
                  className="mt-1"
                  data-ocid="projections.edit_goal_account.select"
                >
                  <SelectValue placeholder="Select account (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {accounts.map((acc) => (
                    <React.Fragment key={acc.id}>
                      <SelectItem value={acc.id}>{acc.name}</SelectItem>
                      {(acc.subAccounts ?? []).map((sub) => (
                        <SelectItem
                          key={`${acc.id}>${sub.id}`}
                          value={`${acc.id}>${sub.id}`}
                        >
                          {acc.name} › {sub.name}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Only the difference from your previous saved amount will be
                applied to the account balance.
              </p>
            </div>
            <div>
              <Label>Date saved / Goal start date (optional)</Label>
              <Input
                type="date"
                value={editGoalForm.startDate}
                onChange={(e) =>
                  setEditGoalForm((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="mt-1"
                data-ocid="projections.edit_goal_date.input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used to timestamp the History record for this contribution.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditingGoalId(null);
                setEditGoalAccountId("");
              }}
              data-ocid="projections.edit_goal.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateGoal}
              style={{
                backgroundColor: "oklch(var(--primary))",
                color: "oklch(var(--primary-foreground))",
              }}
              data-ocid="projections.edit_goal.save_button"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Goal Dialog */}
      <Dialog
        open={showAddGoal}
        onOpenChange={(o) => {
          setShowAddGoal(o);
          if (!o) setGoalAccountId("");
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto"
          data-ocid="projections.add_goal.dialog"
        >
          <DialogHeader>
            <DialogTitle>Add Financial Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subcategory</Label>
              <Select
                value={goalForm.subCategoryId}
                onValueChange={(v) => {
                  const sub = allSubs.find((s) => s.id === v);
                  setGoalForm((prev) => ({
                    ...prev,
                    subCategoryId: v,
                    subCategoryName: sub?.name ?? "",
                  }));
                }}
              >
                <SelectTrigger
                  className="mt-1"
                  data-ocid="projections.goal_sub.select"
                >
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {allSubs.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name} ({sub.catName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="floating-label-group">
              <input
                id="goal-label"
                type="text"
                value={goalForm.label}
                onChange={(e) =>
                  setGoalForm((prev) => ({ ...prev, label: e.target.value }))
                }
                placeholder=" "
                data-ocid="projections.goal_label.input"
              />
              <label htmlFor="goal-label">Goal Label</label>
            </div>
            <div className="floating-label-group">
              <input
                id="goal-amount"
                type="number"
                value={goalForm.targetAmount}
                onChange={(e) =>
                  setGoalForm((prev) => ({
                    ...prev,
                    targetAmount: e.target.value,
                  }))
                }
                placeholder=" "
                min="0"
                data-ocid="projections.goal_amount.input"
              />
              <label htmlFor="goal-amount">Target Amount ({currency})</label>
            </div>
            <div>
              <div className="floating-label-group">
                <input
                  id="goal-saved"
                  type="number"
                  value={goalForm.currentSaved}
                  onChange={(e) =>
                    setGoalForm((prev) => ({
                      ...prev,
                      currentSaved: e.target.value,
                    }))
                  }
                  placeholder=" "
                  min="0"
                  data-ocid="projections.goal_saved.input"
                />
                <label htmlFor="goal-saved">Already saved (optional)</label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                How much you&apos;ve already saved toward this goal
              </p>
            </div>
            {/* Account picker — shown when already saved > 0 */}
            {Number(goalForm.currentSaved) > 0 && (
              <div>
                <Label>Account where this is saved (optional)</Label>
                <Select value={goalAccountId} onValueChange={setGoalAccountId}>
                  <SelectTrigger
                    className="mt-1"
                    data-ocid="projections.goal_account.select"
                  >
                    <SelectValue placeholder="Select account (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {accounts.map((acc) => (
                      <React.Fragment key={acc.id}>
                        <SelectItem value={acc.id}>{acc.name}</SelectItem>
                        {(acc.subAccounts ?? []).map((sub) => (
                          <SelectItem
                            key={`${acc.id}>${sub.id}`}
                            value={`${acc.id}>${sub.id}`}
                          >
                            {acc.name} › {sub.name}
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Selecting an account will increase its balance to reflect past
                  savings.
                </p>
              </div>
            )}
            <div>
              <Label>Date saved / Goal start date (optional)</Label>
              <Input
                type="date"
                value={goalForm.startDate}
                onChange={(e) =>
                  setGoalForm((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="mt-1"
                data-ocid="projections.goal_date.input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used to timestamp the History record for this contribution.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddGoal(false);
                setGoalAccountId("__none__");
              }}
              data-ocid="projections.add_goal.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddGoal}
              style={{
                backgroundColor: "oklch(var(--primary))",
                color: "oklch(var(--primary-foreground))",
              }}
              data-ocid="projections.add_goal.submit_button"
            >
              Add Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calculated locally footer */}
      <p className="text-center text-xs text-muted-foreground pb-6 mt-2">
        🔒 Calculated locally · Your data never leaves this device
      </p>
    </div>
  );
}
