import {
  addDays,
  addMonths,
  addWeeks,
  differenceInDays,
  format,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { DEFAULT_CUSTOM_CATEGORIES } from "../data/categories";
import type {
  Account,
  CCAlert,
  Config,
  CustomCategory,
  Goal,
  IOU,
  IOUEvent,
  ProjectionSettings,
  RecurringTransaction,
  SalaryPeriod,
  Transaction,
} from "../types";
import { useLocalStorage } from "./useLocalStorage";

// Default data is now empty — no seed data
const DEFAULT_RECURRING: RecurringTransaction[] = [];
const DEFAULT_IOUS: IOU[] = [];

const DEFAULT_INCOME_CHIPS = [
  "Salary",
  "Freelance",
  "Business",
  "Interest",
  "Cashback",
  "Bonus",
  "Others",
];

function migrateConfig(config: Config): Config {
  let migrated = config;

  // Step 1: migrate legacy needsPct/wantsPct/savingsPct to customCategories
  if (!migrated.customCategories || migrated.customCategories.length === 0) {
    const needsPct = migrated.needsPct ?? 50;
    const wantsPct = migrated.wantsPct ?? 30;
    const savingsPct = migrated.savingsPct ?? 20;
    const newCats: CustomCategory[] = DEFAULT_CUSTOM_CATEGORIES.map((cat) => {
      if (cat.name === "Needs") return { ...cat, pct: needsPct };
      if (cat.name === "Wants") return { ...cat, pct: wantsPct };
      if (cat.name === "Savings") return { ...cat, pct: savingsPct };
      return cat;
    });
    migrated = { ...migrated, customCategories: newCats };
  }

  // Step 2: migrate subcategory pcts — only if ALL subs are missing pct
  if (migrated.customCategories) {
    const updatedCats = migrated.customCategories.map((cat) => {
      if (cat.subCategories.length === 0) return cat;
      const allMissing = cat.subCategories.every(
        (sub) => !sub.pct || sub.pct === 0,
      );
      if (!allMissing) return cat; // preserve partially-set data

      // Try to find matching default to pull pcts from
      const defaultCat = DEFAULT_CUSTOM_CATEGORIES.find(
        (d) => d.id === cat.id || d.name === cat.name,
      );

      if (
        defaultCat &&
        defaultCat.subCategories.length === cat.subCategories.length
      ) {
        // Map from default by position
        const updatedSubs = cat.subCategories.map((sub, i) => ({
          ...sub,
          pct: defaultCat.subCategories[i]?.pct ?? 0,
        }));
        return { ...cat, subCategories: updatedSubs };
      }

      // Even distribution fallback
      const count = cat.subCategories.length;
      const base = Math.floor(100 / count);
      const remainder = 100 - base * count;
      const updatedSubs = cat.subCategories.map((sub, i) => ({
        ...sub,
        pct: base + (i === count - 1 ? remainder : 0),
      }));
      return { ...cat, subCategories: updatedSubs };
    });
    migrated = { ...migrated, customCategories: updatedCats };
  }

  return migrated;
}

function getNextDueDate(
  startDate: string,
  frequency: RecurringTransaction["frequency"],
  after: Date,
): Date {
  let date = parseISO(startDate);
  const afterTime = after.getTime();
  while (date.getTime() <= afterTime) {
    if (frequency === "weekly") date = addDays(date, 7);
    else if (frequency === "biweekly") date = addDays(date, 14);
    else date = addMonths(date, 1);
  }
  // Go back one step to get last due date on or before 'after'
  if (frequency === "weekly") return addDays(date, -7);
  if (frequency === "biweekly") return addDays(date, -14);
  return addMonths(date, -1);
}

/** Compute outstanding balance for an IOU (amountLent minus all repayments) */
function getIOUBalance(iou: IOU): number {
  const repaid = iou.events
    .filter((e) => e.type === "repay")
    .reduce((sum, e) => sum + e.amount, 0);
  return Math.max(0, iou.amountLent - repaid);
}

export function useFinanceData() {
  const [rawConfig, setRawConfig] = useLocalStorage<Config | null>(
    "sft_config",
    null,
  );
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>(
    "sft_transactions",
    [],
  );
  const [periods, setPeriods] = useLocalStorage<SalaryPeriod[]>(
    "sft_periods",
    [],
  );
  const [recurring, setRecurring] = useLocalStorage<RecurringTransaction[]>(
    "sft_recurring",
    DEFAULT_RECURRING,
  );
  const [accounts, setAccounts] = useLocalStorage<Account[]>(
    "sft_accounts",
    [],
  );
  const [goals, setGoals] = useLocalStorage<Goal[]>("sft_goals", []);
  const [projectionSettings, setProjectionSettings] =
    useLocalStorage<ProjectionSettings>("sft_projection_settings", {
      monthlyIncome: 19000,
      returnRatePct: 7,
    });
  const [ious, setIOUs] = useLocalStorage<IOU[]>("sft_ious", DEFAULT_IOUS);

  // Migrate config on first load if needed
  const config = rawConfig ? migrateConfig(rawConfig) : null;
  const setConfig = setRawConfig;

  const isOnboarded =
    config !== null && config.name !== "" && config.salary > 0;

  const customCategories =
    config?.customCategories ?? DEFAULT_CUSTOM_CATEGORIES;

  // Income source chips
  const incomeSourceChips = config?.incomeSourceChips ?? DEFAULT_INCOME_CHIPS;

  const updateIncomeSourceChips = useCallback(
    (chips: string[]) => {
      setConfig((prev) =>
        prev ? { ...prev, incomeSourceChips: chips } : prev,
      );
    },
    [setConfig],
  );

  // Auto-generate recurring transactions on mount (once)
  const hasAutoGenerated = useRef(false);
  const configRef = useRef(config);
  const recurringRef = useRef(recurring);
  const isOnboardedRef = useRef(isOnboarded);
  const setTransactionsRef = useRef(setTransactions);
  const setRecurringRef = useRef(setRecurring);
  const setIOUsRef = useRef(setIOUs);
  configRef.current = config;
  recurringRef.current = recurring;
  isOnboardedRef.current = isOnboarded;
  setTransactionsRef.current = setTransactions;
  setRecurringRef.current = setRecurring;
  setIOUsRef.current = setIOUs;

  // Keep a stable ref to setAccounts for use inside effects/callbacks
  const setAccountsRef = useRef(setAccounts);
  setAccountsRef.current = setAccounts;

  useEffect(() => {
    if (hasAutoGenerated.current) return;
    const cfg = configRef.current;
    const rec = recurringRef.current;
    const onboarded = isOnboardedRef.current;
    if (!cfg || !onboarded) return;
    hasAutoGenerated.current = true;

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const periodStart = parseISO(cfg.startDate);
    let generated = 0;
    const missed: string[] = [];

    const updatedRecurring = rec.map((rule) => {
      if (!rule.isActive) return rule;
      // Rule hasn't started yet — skip entirely, not missed
      if (rule.startDate > todayStr) return rule;
      try {
        const lastDue = getNextDueDate(rule.startDate, rule.frequency, today);
        const lastDueStr = format(lastDue, "yyyy-MM-dd");

        // Check if this rule is "missed" — due before current period start
        if (lastDue < periodStart) {
          // Rule was supposed to fire before the current period, may be missed
          if (rule.lastGenerated === null || rule.lastGenerated < lastDueStr) {
            missed.push(rule.description || rule.subCategory);
          }
          return rule;
        }

        if (rule.lastGenerated === lastDueStr) return rule;
        const newTx: Transaction = {
          id: crypto.randomUUID(),
          amount: rule.amount,
          date: lastDueStr,
          mainCategory: rule.mainCategory,
          subCategory: rule.subCategory,
          description: rule.description,
          type: "expense",
          account: rule.account,
        };
        setTransactionsRef.current((prev) => [newTx, ...prev]);

        // Debit account balance if rule has an account
        if (rule.account) {
          setAccountsRef.current((prev) =>
            prev.map((a) =>
              a.name === rule.account
                ? { ...a, balance: a.balance - rule.amount }
                : a,
            ),
          );
        }

        generated++;
        return { ...rule, lastGenerated: lastDueStr };
      } catch {
        return rule;
      }
    });

    if (generated > 0) {
      setRecurringRef.current(updatedRecurring);
      toast.success(
        `Auto-generated ${generated} recurring transaction${generated > 1 ? "s" : ""}`,
        { duration: 3000 },
      );
    }

    if (missed.length > 0) {
      toast.warning(`Missed recurring: ${missed.join(", ")}`, {
        duration: 5000,
      });
    }
  }, []); // run once on mount

  useEffect(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    setIOUsRef.current((prev) =>
      prev.map((iou) => {
        if (iou.status === "current" && iou.dueDate < todayStr) {
          return { ...iou, status: "overdue" };
        }
        return iou;
      }),
    );
  }, []); // run once on mount

  const getPeriodEndDate = useCallback(
    (startDate: string, periodType: string): string => {
      const start = parseISO(startDate);
      let end: Date;
      switch (periodType) {
        case "biweekly":
          end = addWeeks(start, 2);
          break;
        case "weekly":
          end = addWeeks(start, 1);
          break;
        case "custom":
          // For custom period, use stored customEndDate from config
          if (config?.customEndDate) return config.customEndDate;
          end = addMonths(start, 1);
          break;
        default:
          end = addMonths(start, 1);
      }
      return format(end, "yyyy-MM-dd");
    },
    [config?.customEndDate],
  );

  const currentPeriodEnd = config
    ? getPeriodEndDate(config.startDate, config.period)
    : format(new Date(), "yyyy-MM-dd");

  const currentTransactions = transactions.filter((t) => {
    if (!config) return false;
    try {
      const txDate = parseISO(t.date);
      const start = parseISO(config.startDate);
      const end = parseISO(currentPeriodEnd);
      return isWithinInterval(txDate, { start, end });
    } catch {
      return true;
    }
  });

  const getBudgetForCategory = useCallback(
    (catName: string): number => {
      if (!config) return 0;
      const cat = customCategories.find(
        (c) => c.name.toLowerCase() === catName.toLowerCase(),
      );
      if (!cat) return 0;
      if (cat.allocationMode === "amount" && cat.allocationAmount != null) {
        return cat.allocationAmount;
      }
      return (config.salary * cat.pct) / 100;
    },
    [config, customCategories],
  );

  const getBudgetForSubCategory = useCallback(
    (catName: string, subName: string): number => {
      const cat = customCategories.find(
        (c) => c.name.toLowerCase() === catName.toLowerCase(),
      );
      if (!cat) return 0;
      const sub = cat.subCategories.find((s) => s.name === subName);
      if (!sub || !sub.pct) return 0;
      const catBudget = getBudgetForCategory(catName);
      return (catBudget * sub.pct) / 100;
    },
    [customCategories, getBudgetForCategory],
  );

  const getSpentForCategory = useCallback(
    (catName: string, txList?: Transaction[]): number => {
      const list = txList ?? currentTransactions;
      return list
        .filter(
          (t) =>
            t.mainCategory.toLowerCase() === catName.toLowerCase() &&
            t.type === "expense",
        )
        .reduce((sum, t) => sum + t.amount, 0);
    },
    [currentTransactions],
  );

  const getSpentForSubCategory = useCallback(
    (subCat: string, txList?: Transaction[]): number => {
      const list = txList ?? currentTransactions;
      return list
        .filter((t) => t.subCategory === subCat && t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
    },
    [currentTransactions],
  );

  const getMainCatForSub = useCallback(
    (subName: string): string | null => {
      for (const cat of customCategories) {
        if (cat.subCategories.some((s) => s.name === subName)) {
          return cat.name;
        }
      }
      return null;
    },
    [customCategories],
  );

  const getSubColor = useCallback(
    (mainCatName: string, subName: string): string => {
      const cat = customCategories.find((c) => c.name === mainCatName);
      if (!cat) return "#888";
      const sub = cat.subCategories.find((s) => s.name === subName);
      return sub?.color ?? cat.color;
    },
    [customCategories],
  );

  const totalExpenses = currentTransactions
    .filter((t) => t.type === "expense" && t.mainCategory !== "Transfer")
    .reduce((sum, t) => sum + t.amount, 0);

  // All income transactions this period
  const incomeFromTx = currentTransactions
    .filter((t) => t.type === "income" && t.mainCategory !== "Transfer")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = incomeFromTx > 0 ? incomeFromTx : (config?.salary ?? 0);

  // Salary income: only transactions whose subCategory matches the first income chip
  // (user's primary salary chip — defaults to "Salary" but is fully editable)
  const salaryChip = incomeSourceChips[0] ?? "Salary";
  const salaryIncomeFromTx = currentTransactions
    .filter((t) => t.type === "income" && t.subCategory === salaryChip)
    .reduce((sum, t) => sum + t.amount, 0);
  // Fall back to config.salary baseline if no salary-chip transactions logged yet
  const salaryIncome =
    salaryIncomeFromTx > 0 ? salaryIncomeFromTx : (config?.salary ?? 0);

  const remaining = salaryIncome - totalExpenses;

  const periodProgress = (() => {
    if (!config) return 0;
    try {
      const start = parseISO(config.startDate);
      const end = parseISO(currentPeriodEnd);
      const now = new Date();
      const total = differenceInDays(end, start);
      const elapsed = differenceInDays(now, start);
      return Math.min(100, Math.max(0, (elapsed / total) * 100));
    } catch {
      return 0;
    }
  })();

  const addTransaction = useCallback(
    (tx: Omit<Transaction, "id">) => {
      const newTx: Transaction = { ...tx, id: crypto.randomUUID() };
      setTransactions((prev) => [newTx, ...prev]);
      return newTx;
    },
    [setTransactions],
  );

  const updateTransaction = useCallback(
    (id: string, updates: Partial<Transaction>) => {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      );
    },
    [setTransactions],
  );

  /**
   * Delete a transaction and reverse its balance effect on the associated account.
   * Uses a nested functional updater so balances are always read from fresh state.
   */
  const deleteTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => {
        const tx = prev.find((t) => t.id === id);
        if (tx?.account) {
          setAccounts((accs) =>
            accs.map((a) => {
              if (a.name !== tx.account) return a;
              const delta =
                tx.type === "expense"
                  ? tx.amount // add back what was deducted
                  : tx.type === "income"
                    ? -tx.amount // deduct what was credited
                    : 0;
              return { ...a, balance: a.balance + delta };
            }),
          );
        }
        return prev.filter((t) => t.id !== id);
      });
    },
    [setTransactions, setAccounts],
  );

  const startNewPeriod = useCallback(() => {
    if (!config) return;
    const newPeriod: SalaryPeriod = {
      id: crypto.randomUUID(),
      startDate: config.startDate,
      endDate: currentPeriodEnd,
      salary: config.salary,
      transactions: [...currentTransactions],
    };
    setPeriods((prev) => [newPeriod, ...prev]);
    const newStart = format(new Date(), "yyyy-MM-dd");
    setConfig((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, startDate: newStart };
      // Clear custom end date when starting a new period — user must re-set it
      if (prev.period === "custom") {
        (updated as Config & { customEndDate?: string }).customEndDate =
          undefined;
      }
      return updated;
    });
    setTransactions((prev) =>
      prev.filter((t) => !currentTransactions.find((ct) => ct.id === t.id)),
    );
    // Reset recurring lastGenerated so they generate fresh next period
    setRecurring((prev) => prev.map((r) => ({ ...r, lastGenerated: null })));
    hasAutoGenerated.current = false;
  }, [
    config,
    currentPeriodEnd,
    currentTransactions,
    setPeriods,
    setConfig,
    setTransactions,
    setRecurring,
  ]);

  const resetAllData = useCallback(() => {
    setConfig(null);
    setTransactions([]);
    setPeriods([]);
    setRecurring([]);
    setAccounts([]);
    setGoals([]);
    setProjectionSettings({ monthlyIncome: 19000, returnRatePct: 7 });
    setIOUs([]);
    localStorage.removeItem("sft_config");
    localStorage.removeItem("sft_transactions");
    localStorage.removeItem("sft_periods");
    localStorage.removeItem("sft_recurring");
    localStorage.removeItem("sft_accounts");
    localStorage.removeItem("sft_goals");
    localStorage.removeItem("sft_projection_settings");
    localStorage.removeItem("sft_ious");
  }, [
    setConfig,
    setTransactions,
    setPeriods,
    setRecurring,
    setAccounts,
    setGoals,
    setProjectionSettings,
    setIOUs,
  ]);

  const exportData = useCallback(() => {
    const data = {
      config,
      transactions,
      periods,
      recurring,
      accounts,
      goals,
      projectionSettings,
      ious,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flow-tracker-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [
    config,
    transactions,
    periods,
    recurring,
    accounts,
    goals,
    projectionSettings,
    ious,
  ]);

  const importData = useCallback(
    (jsonString: string) => {
      try {
        const data = JSON.parse(jsonString);
        if (data.config) setConfig(data.config);
        if (data.transactions) setTransactions(data.transactions);
        if (data.periods) setPeriods(data.periods);
        if (data.recurring) setRecurring(data.recurring);
        if (data.accounts) setAccounts(data.accounts);
        if (data.goals) setGoals(data.goals);
        if (data.projectionSettings)
          setProjectionSettings(data.projectionSettings);
        if (data.ious) setIOUs(data.ious);
        return true;
      } catch {
        return false;
      }
    },
    [
      setConfig,
      setTransactions,
      setPeriods,
      setRecurring,
      setAccounts,
      setGoals,
      setProjectionSettings,
      setIOUs,
    ],
  );

  // Export ALL transactions (across all periods), not just current
  const exportCSV = useCallback(() => {
    const headers = [
      "Date",
      "Type",
      "Category",
      "SubCategory",
      "Description",
      "Amount",
      "Account",
    ];
    // Gather all transactions: current + all archived periods
    const allTxs: Transaction[] = [...transactions];
    for (const period of periods) {
      for (const tx of period.transactions) {
        if (!allTxs.find((t) => t.id === tx.id)) {
          allTxs.push(tx);
        }
      }
    }
    // Sort descending by date
    allTxs.sort((a, b) => b.date.localeCompare(a.date));

    const rows = allTxs.map((t) => [
      t.date,
      t.type,
      t.mainCategory,
      t.subCategory,
      t.description,
      t.amount.toString(),
      t.account ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transactions, periods]);

  // Recurring CRUD
  const addRecurring = useCallback(
    (r: Omit<RecurringTransaction, "id">) => {
      const newR: RecurringTransaction = { ...r, id: crypto.randomUUID() };
      setRecurring((prev) => [newR, ...prev]);
    },
    [setRecurring],
  );

  const updateRecurring = useCallback(
    (id: string, updates: Partial<RecurringTransaction>) => {
      setRecurring((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      );
    },
    [setRecurring],
  );

  const deleteRecurring = useCallback(
    (id: string) => {
      setRecurring((prev) => prev.filter((r) => r.id !== id));
    },
    [setRecurring],
  );

  // Account CRUD
  const addAccount = useCallback(
    (acc: Omit<Account, "id">) => {
      const newAcc: Account = { ...acc, id: crypto.randomUUID() };
      setAccounts((prev) => [...prev, newAcc]);
    },
    [setAccounts],
  );

  const updateAccount = useCallback(
    (id: string, updates: Partial<Account>) => {
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      );
    },
    [setAccounts],
  );

  /**
   * Safely increments an account balance inside the functional updater,
   * avoiding stale-closure issues when reading `accounts` from render scope.
   */
  const creditAccount = useCallback(
    (id: string, amount: number) => {
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, balance: a.balance + amount } : a,
        ),
      );
    },
    [setAccounts],
  );

  /**
   * Safely decrements an account balance inside the functional updater.
   */
  const debitAccount = useCallback(
    (id: string, amount: number) => {
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, balance: a.balance - amount } : a,
        ),
      );
    },
    [setAccounts],
  );

  const deleteAccount = useCallback(
    (id: string) => {
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    },
    [setAccounts],
  );

  const reorderAccounts = useCallback(
    (newOrder: Account[]) => {
      setAccounts(newOrder);
    },
    [setAccounts],
  );

  /**
   * Transfer between accounts — uses a single functional updater to avoid
   * stale-closure balance reads.
   */
  const transferBetweenAccounts = useCallback(
    (fromId: string, toId: string, amount: number, note: string) => {
      const today = format(new Date(), "yyyy-MM-dd");
      let fromName = "";
      let toName = "";

      setAccounts((prev) => {
        const fromAcc = prev.find((a) => a.id === fromId);
        const toAcc = prev.find((a) => a.id === toId);
        if (!fromAcc || !toAcc) return prev;
        fromName = fromAcc.name;
        toName = toAcc.name;
        return prev.map((a) => {
          if (a.id === fromId) return { ...a, balance: a.balance - amount };
          if (a.id === toId) return { ...a, balance: a.balance + amount };
          return a;
        });
      });

      // Log transfer transactions — names may be empty if accounts not found,
      // but we schedule this after the state update via microtask to get fresh names.
      // Since setAccounts is synchronous in terms of closure capture here, we
      // read names from the current render-scope as fallback.
      const currentFrom = accounts.find((a) => a.id === fromId);
      const currentTo = accounts.find((a) => a.id === toId);
      const resolvedFromName = fromName || currentFrom?.name || "";
      const resolvedToName = toName || currentTo?.name || "";

      const outTx: Transaction = {
        id: crypto.randomUUID(),
        amount,
        date: today,
        mainCategory: "Transfer",
        subCategory: "",
        description: `Transfer to ${resolvedToName}${
          note ? ` \u2013 ${note}` : ""
        }`,
        type: "expense",
      };
      const inTx: Transaction = {
        id: crypto.randomUUID(),
        amount,
        date: today,
        mainCategory: "Transfer",
        subCategory: "",
        description: `Transfer from ${resolvedFromName}${
          note ? ` \u2013 ${note}` : ""
        }`,
        type: "income",
      };
      setTransactions((prev) => [outTx, inTx, ...prev]);
    },
    [accounts, setAccounts, setTransactions],
  );

  // Goal CRUD
  /**
   * Add a goal with optional account linking for "already saved" amount.
   * If accountId and savedAmount are provided, the account balance is credited
   * directly (no transaction record — this is a one-time past-savings init).
   */
  const addGoalWithAccount = useCallback(
    (g: Omit<Goal, "id">, accountId?: string, savedAmount?: number) => {
      const hasAccount = !!(accountId && savedAmount && savedAmount > 0);
      const newGoal: Goal = {
        ...g,
        id: crypto.randomUUID(),
        alreadySavedAccountId: hasAccount ? accountId : undefined,
        alreadySavedAmount: hasAccount ? savedAmount : undefined,
      };
      setGoals((prev) => [...prev, newGoal]);
      // Credit account balance directly — no transaction created
      if (hasAccount && accountId && savedAmount) {
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.id === accountId
              ? { ...acc, balance: acc.balance + savedAmount }
              : acc,
          ),
        );
      }
    },
    [setGoals, setAccounts],
  );

  // Backward-compatible wrapper
  const addGoal = useCallback(
    (g: Omit<Goal, "id">) => addGoalWithAccount(g),
    [addGoalWithAccount],
  );

  /**
   * Update a goal with optional account balance delta adjustment.
   * Only the DIFFERENCE between the new alreadySaved and the old alreadySavedAmount
   * is applied to the account, preventing double-counting.
   */
  const updateGoalWithAccount = useCallback(
    (id: string, updates: Partial<Goal>, newAccountId?: string) => {
      setGoals((prev) => {
        const existing = prev.find((g) => g.id === id);
        if (!existing) return prev;

        const oldSaved = existing.alreadySavedAmount ?? 0;
        const rawNewSaved =
          updates.currentSaved ??
          updates.alreadySavedAmount ??
          existing.alreadySavedAmount ??
          0;
        const newSaved = Number.isFinite(rawNewSaved) ? rawNewSaved : oldSaved;
        const delta = newSaved - oldSaved;

        // Apply delta to account balance if an account is set
        const targetAccountId = newAccountId || existing.alreadySavedAccountId;
        if (targetAccountId && delta !== 0) {
          setAccounts((prevAcc) =>
            prevAcc.map((acc) =>
              acc.id === targetAccountId
                ? { ...acc, balance: acc.balance + delta }
                : acc,
            ),
          );
        }

        const updatedGoal: Goal = {
          ...existing,
          ...updates,
          alreadySavedAccountId:
            targetAccountId || existing.alreadySavedAccountId,
          alreadySavedAmount:
            newSaved > 0 ? newSaved : existing.alreadySavedAmount,
        };
        return prev.map((g) => (g.id === id ? updatedGoal : g));
      });
    },
    [setGoals, setAccounts],
  );

  // Backward-compatible wrapper
  const updateGoal = useCallback(
    (id: string, updates: Partial<Goal>) => updateGoalWithAccount(id, updates),
    [updateGoalWithAccount],
  );

  const deleteGoal = useCallback(
    (id: string) => {
      setGoals((prev) => prev.filter((g) => g.id !== id));
    },
    [setGoals],
  );

  const updateProjectionSettings = useCallback(
    (updates: Partial<ProjectionSettings>) => {
      setProjectionSettings((prev) => ({ ...prev, ...updates }));
    },
    [setProjectionSettings],
  );

  // CC Alerts
  const getCCAlerts = useCallback((): CCAlert[] => {
    const alerts: CCAlert[] = [];
    const today = new Date();
    for (const acc of accounts) {
      if (acc.type !== "credit") continue;
      // Utilization alert
      if (acc.creditLimit && acc.creditLimit > 0) {
        const util = (acc.balance / acc.creditLimit) * 100;
        if (util >= 70) {
          alerts.push({
            accountId: acc.id,
            accountName: acc.name,
            type: "utilization",
            message: `${acc.name}: ${Math.round(util)}% utilized`,
          });
        }
      }
      // Due date alert
      if (acc.dueDate) {
        try {
          const due = parseISO(acc.dueDate);
          const daysUntilDue = differenceInDays(due, today);
          if (daysUntilDue >= 0 && daysUntilDue <= 3) {
            alerts.push({
              accountId: acc.id,
              accountName: acc.name,
              type: "due_soon",
              message: `${acc.name}: due in ${daysUntilDue} day${
                daysUntilDue !== 1 ? "s" : ""
              }`,
            });
          }
        } catch {
          // ignore invalid dates
        }
      }
    }
    return alerts;
  }, [accounts]);

  // Missed recurring detection
  const missedRecurring = (() => {
    if (!config) return [];
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const periodStart = parseISO(config.startDate);
    return recurring.filter((rule) => {
      if (!rule.isActive) return false;
      // Rule hasn't started yet — not missed, just scheduled
      if (rule.startDate > todayStr) return false;
      try {
        const lastDue = getNextDueDate(rule.startDate, rule.frequency, today);
        // Rule was due before current period start and wasn't generated
        if (lastDue < periodStart) {
          return (
            rule.lastGenerated === null ||
            rule.lastGenerated < format(lastDue, "yyyy-MM-dd")
          );
        }
        return false;
      } catch {
        return false;
      }
    });
  })();

  const allSubCategories = customCategories.flatMap((cat) =>
    cat.subCategories.map((sub) => ({
      name: sub.name,
      icon: sub.icon,
      badgeColor: sub.color ?? cat.color,
      mainCategory: cat.name,
    })),
  );

  // IOU derived values — only count lent IOUs for receivables
  const totalIOUsOwed = ious
    .filter(
      (iou) =>
        (iou.direction === "lent" || !iou.direction) &&
        (iou.status === "current" || iou.status === "overdue"),
    )
    .reduce((sum, iou) => sum + getIOUBalance(iou), 0);

  // Borrowed IOUs (money you owe) — shown as liabilities
  const totalIOUsBorrowed = ious
    .filter(
      (iou) =>
        iou.direction === "borrowed" &&
        (iou.status === "current" || iou.status === "overdue"),
    )
    .reduce((sum, iou) => sum + getIOUBalance(iou), 0);

  // IOU CRUD
  const addIOU = useCallback(
    (data: Omit<IOU, "id" | "events" | "status">, sourceAccountId?: string) => {
      const id = crypto.randomUUID();
      const lendEvent: IOUEvent = {
        id: crypto.randomUUID(),
        date: data.dateLent,
        type: "lend",
        amount: data.amountLent,
        accountId: sourceAccountId,
      };
      const newIOU: IOU = {
        ...data,
        id,
        status: "current",
        direction: "lent",
        events: [lendEvent],
      };
      setIOUs((prev) => [newIOU, ...prev]);

      // Log lend as expense transaction from the source account
      if (sourceAccountId) {
        // Debit the source account using functional updater (no stale closure)
        debitAccount(sourceAccountId, data.amountLent);
        // Look up account name for transaction record
        const srcAcc = accounts.find((a) => a.id === sourceAccountId);
        addTransaction({
          amount: data.amountLent,
          date: data.dateLent,
          mainCategory: "IOU",
          subCategory: data.personName,
          description: `Lent \u20b1${data.amountLent.toLocaleString()} to ${data.personName}`,
          type: "expense",
          account: srcAcc?.name,
        });
      }
    },
    [setIOUs, addTransaction, accounts, debitAccount],
  );

  const addBorrowedIOU = useCallback(
    (
      data: Omit<IOU, "id" | "events" | "status" | "direction">,
      destAccountId?: string,
    ) => {
      const id = crypto.randomUUID();
      const borrowEvent: IOUEvent = {
        id: crypto.randomUUID(),
        date: data.dateLent,
        type: "borrow",
        amount: data.amountLent,
        accountId: destAccountId,
      };
      const newIOU: IOU = {
        ...data,
        id,
        status: "current",
        direction: "borrowed",
        events: [borrowEvent],
      };
      setIOUs((prev) => [newIOU, ...prev]);

      if (destAccountId) {
        // Credit the destination account using functional updater
        creditAccount(destAccountId, data.amountLent);
        const destAcc = accounts.find((a) => a.id === destAccountId);
        addTransaction({
          amount: data.amountLent,
          date: data.dateLent,
          mainCategory: "IOU",
          subCategory: data.personName,
          description: `Borrowed \u20b1${data.amountLent.toLocaleString()} from ${data.personName}`,
          type: "income",
          account: destAcc?.name,
        });
      }
    },
    [setIOUs, addTransaction, accounts, creditAccount],
  );

  const repayIOU = useCallback(
    (
      iouId: string,
      amount: number,
      accountId: string,
      date: string,
      note?: string,
    ) => {
      setIOUsRef.current((prev) =>
        prev.map((iou) => {
          if (iou.id !== iouId) return iou;
          const repayEvent: IOUEvent = {
            id: crypto.randomUUID(),
            date,
            type: "repay",
            amount,
            accountId,
            note,
          };
          const newEvents = [...iou.events, repayEvent];
          const newBalance =
            iou.amountLent -
            newEvents
              .filter((e) => e.type === "repay")
              .reduce((s, e) => s + e.amount, 0);
          const newStatus =
            newBalance <= 0
              ? "paid"
              : iou.dueDate < format(new Date(), "yyyy-MM-dd")
                ? "overdue"
                : "current";
          return { ...iou, events: newEvents, status: newStatus };
        }),
      );

      // Log repayment as income to the chosen account (lent IOU — you receive back)
      const iou = ious.find((i) => i.id === iouId);
      const repayAcc = accounts.find((a) => a.id === accountId);
      addTransaction({
        amount,
        date,
        mainCategory: "IOU",
        subCategory: iou?.personName ?? "",
        description: `${iou?.personName ?? ""} repaid \u20b1${amount.toLocaleString()}${
          note ? ` \u2013 ${note}` : ""
        }`,
        type: "income",
        account: repayAcc?.name,
      });

      // Credit the account balance using functional updater
      creditAccount(accountId, amount);
    },
    [ious, addTransaction, accounts, creditAccount],
  );

  const repayBorrowedIOU = useCallback(
    (
      iouId: string,
      amount: number,
      accountId: string,
      date: string,
      note?: string,
    ) => {
      setIOUsRef.current((prev) =>
        prev.map((iou) => {
          if (iou.id !== iouId) return iou;
          const repayEvent: IOUEvent = {
            id: crypto.randomUUID(),
            date,
            type: "repay",
            amount,
            accountId,
            note,
          };
          const newEvents = [...iou.events, repayEvent];
          const newBalance =
            iou.amountLent -
            newEvents
              .filter((e) => e.type === "repay")
              .reduce((s, e) => s + e.amount, 0);
          const newStatus =
            newBalance <= 0
              ? "paid"
              : iou.dueDate < format(new Date(), "yyyy-MM-dd")
                ? "overdue"
                : "current";
          return { ...iou, events: newEvents, status: newStatus };
        }),
      );

      // Log as expense transaction (you paid out money)
      const iou = ious.find((i) => i.id === iouId);
      const repayAcc = accounts.find((a) => a.id === accountId);
      addTransaction({
        amount,
        date,
        mainCategory: "IOU",
        subCategory: iou?.personName ?? "",
        description: `Repaid \u20b1${amount.toLocaleString()} to ${iou?.personName ?? ""}${
          note ? ` \u2013 ${note}` : ""
        }`,
        type: "expense",
        account: repayAcc?.name,
      });

      // Debit the source account using functional updater
      debitAccount(accountId, amount);
    },
    [ious, addTransaction, accounts, debitAccount],
  );

  const forgivenIOU = useCallback((iouId: string) => {
    setIOUsRef.current((prev) =>
      prev.map((iou) => {
        if (iou.id !== iouId) return iou;
        const forgivenEvent: IOUEvent = {
          id: crypto.randomUUID(),
          date: format(new Date(), "yyyy-MM-dd"),
          type: "forgiven",
          amount: getIOUBalance(iou),
        };
        return {
          ...iou,
          status: "forgiven",
          events: [...iou.events, forgivenEvent],
        };
      }),
    );
  }, []);

  const markIOUPaid = useCallback((iouId: string) => {
    setIOUsRef.current((prev) =>
      prev.map((iou) => {
        if (iou.id !== iouId) return iou;
        const paidEvent: IOUEvent = {
          id: crypto.randomUUID(),
          date: format(new Date(), "yyyy-MM-dd"),
          type: "paid",
          amount: getIOUBalance(iou),
        };
        return {
          ...iou,
          status: "paid",
          events: [...iou.events, paidEvent],
        };
      }),
    );
  }, []);

  const deleteIOU = useCallback(
    (iouId: string) => {
      setIOUs((prev) => prev.filter((iou) => iou.id !== iouId));
    },
    [setIOUs],
  );

  return {
    config,
    setConfig,
    transactions,
    periods,
    recurring,
    customCategories,
    isOnboarded,
    currentTransactions,
    currentPeriodEnd,
    getBudgetForCategory,
    getBudgetForSubCategory,
    getSpentForCategory,
    getSpentForSubCategory,
    getMainCatForSub,
    getSubColor,
    totalIncome,
    totalExpenses,
    salaryIncome,
    remaining,
    periodProgress,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    startNewPeriod,
    resetAllData,
    exportData,
    importData,
    exportCSV,
    allSubCategories,
    getPeriodEndDate,
    accounts,
    addAccount,
    updateAccount,
    creditAccount,
    debitAccount,
    deleteAccount,
    reorderAccounts,
    transferBetweenAccounts,
    goals,
    addGoal,
    addGoalWithAccount,
    updateGoal,
    updateGoalWithAccount,
    deleteGoal,
    projectionSettings,
    updateProjectionSettings,
    getCCAlerts,
    missedRecurring,
    // IOU
    ious,
    totalIOUsOwed,
    totalIOUsBorrowed,
    addIOU,
    addBorrowedIOU,
    repayIOU,
    repayBorrowedIOU,
    forgivenIOU,
    markIOUPaid,
    deleteIOU,
    // Income source chips
    incomeSourceChips,
    updateIncomeSourceChips,
  };
}
