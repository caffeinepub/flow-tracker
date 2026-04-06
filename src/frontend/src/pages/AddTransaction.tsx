import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CategoryIcon } from "../components/CategoryIcon";
import { HelpSheet } from "../components/HelpSheet";
import { suggestCategory } from "../data/categories";
import { useFinanceData } from "../hooks/useFinanceData";
import { useTranslation } from "../hooks/useTranslation";
import type { TransactionType } from "../types";

// Extended local type to include saveToGoal without breaking the shared TransactionType
type LocalTransactionType = TransactionType | "saveToGoal";

interface AddTransactionProps {
  onDone: () => void;
  initialAmount?: string;
  initialDate?: string;
  initialDescription?: string;
}

export function AddTransaction({
  onDone,
  initialAmount,
  initialDate,
  initialDescription,
}: AddTransactionProps) {
  const t = useTranslation();
  const {
    config,
    customCategories,
    addTransaction,
    getBudgetForCategory,
    getSpentForSubCategory,
    getMainCatForSub,
    accounts,
    creditAccount,
    debitAccount,
    incomeSourceChips,
    goals,
    addIOU,
    updateTransaction,
  } = useFinanceData();

  const [amount, setAmount] = useState(initialAmount ?? "");
  const [type, setType] = useState<LocalTransactionType>("expense");
  const [date, setDate] = useState(
    initialDate ?? format(new Date(), "yyyy-MM-dd"),
  );
  const [subCategory, setSubCategory] = useState("");
  const [description, setDescription] = useState(initialDescription ?? "");
  // Store account ID (UUID) instead of name to avoid lookup failures
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [showSuggestion, setShowSuggestion] = useState<string | null>(null);

  // Save to Goal state
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [toAccountId, setToAccountId] = useState("");

  // Split expense state
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitPersonName, setSplitPersonName] = useState("");
  const [splitAmount, setSplitAmount] = useState("");

  // Calculator state
  const [showCalc, setShowCalc] = useState(false);
  const [calcExpression, setCalcExpression] = useState("");
  const [calcResult, setCalcResult] = useState("");

  const mainCat = subCategory ? getMainCatForSub(subCategory) : null;

  useEffect(() => {
    if (type === "expense" && description.length >= 2) {
      const suggestion = suggestCategory(description);
      if (suggestion && suggestion !== subCategory) {
        setShowSuggestion(suggestion);
      } else {
        setShowSuggestion(null);
      }
    } else {
      setShowSuggestion(null);
    }
  }, [description, subCategory, type]);

  // Calculator evaluation helper
  function evalCalc(expr: string): number {
    const sanitized = expr.replace(/×/g, "*").replace(/÷/g, "/");
    if (!/^[0-9+\-*/.]+$/.test(sanitized)) return 0;
    try {
      return Function(`"use strict"; return (${sanitized})`)() as number;
    } catch {
      return 0;
    }
  }

  const handleCalcButton = (val: string) => {
    if (val === "⌫") {
      setCalcExpression((prev) => prev.slice(0, -1));
      setCalcResult("");
      return;
    }
    if (val === "=") {
      const result = evalCalc(calcExpression);
      setCalcResult(result.toString());
      return;
    }
    if (val === "✓") {
      const result = calcResult || evalCalc(calcExpression).toString();
      if (result && Number(result) > 0) {
        setAmount(Number(result).toString());
      }
      setShowCalc(false);
      setCalcExpression("");
      setCalcResult("");
      return;
    }
    setCalcExpression((prev) => prev + val);
    setCalcResult("");
  };

  const handleSubmit = () => {
    const num = Number.parseFloat(amount);
    if (!num || num <= 0) {
      toast.error(t("positiveAmount"));
      return;
    }

    // ── Save to Goal flow ──────────────────────────────────────────────────────
    if (type === "saveToGoal") {
      if (!selectedGoalId) {
        toast.error("Please select a goal");
        return;
      }
      if (!selectedAccountId) {
        toast.error("From Account is required");
        return;
      }

      const selectedGoal = goals.find((g) => g.id === selectedGoalId);
      if (!selectedGoal) {
        toast.error("Goal not found");
        return;
      }

      // Find parent category — case-insensitive trim match by subCategoryId first, then by name
      let parentCatName = customCategories[0]?.name ?? "Savings";
      for (const cat of customCategories) {
        // Try matching by subCategoryId first (most reliable)
        if (
          cat.subCategories.some((s) => s.id === selectedGoal.subCategoryId)
        ) {
          parentCatName = cat.name;
          break;
        }
        // Fall back to name match (case-insensitive, trimmed)
        if (
          cat.subCategories.some(
            (s) =>
              s.name.trim().toLowerCase() ===
              selectedGoal.subCategoryName.trim().toLowerCase(),
          )
        ) {
          parentCatName = cat.name;
          break;
        }
      }

      const fromAcc = accounts.find((a) => a.id === selectedAccountId);
      const toAcc = toAccountId
        ? accounts.find((a) => a.id === toAccountId)
        : null;
      const goalLabel = selectedGoal.label || selectedGoal.subCategoryName;

      // Ensure parentCatName is never empty and never "Transfer"
      if (!parentCatName || parentCatName === "Transfer") {
        parentCatName = customCategories[0]?.name ?? "Savings";
      }

      // 1. Log the goal expense transaction FIRST (tracks budget + goal progress)
      // This must be logged before onDone() is called
      addTransaction({
        amount: num,
        date,
        type: "expense",
        mainCategory: parentCatName,
        subCategory: selectedGoal.subCategoryName,
        description: description || `Saved to ${goalLabel}`,
        account: fromAcc?.name,
      });

      // 2. Debit from-account
      debitAccount(selectedAccountId, num);

      // 3. Credit to-account if different from from-account
      if (toAccountId && toAccountId !== selectedAccountId && toAcc) {
        creditAccount(toAccountId, num);
      }

      // 4. Log transfer records for history if accounts differ
      if (
        toAccountId &&
        toAccountId !== selectedAccountId &&
        toAcc &&
        fromAcc
      ) {
        addTransaction({
          amount: num,
          date,
          type: "expense",
          mainCategory: "Transfer",
          subCategory: "",
          description: `Transfer to ${toAcc.name} – Goal: ${goalLabel}`,
          account: fromAcc.name,
        });
        addTransaction({
          amount: num,
          date,
          type: "income",
          mainCategory: "Transfer",
          subCategory: "",
          description: `Transfer from ${fromAcc.name} – Goal: ${goalLabel}`,
          account: toAcc.name,
        });
      }

      toast.success(`Saved to ${goalLabel}!`);
      setAmount("");
      setDescription("");
      setSubCategory("");
      setSelectedAccountId("");
      setSelectedGoalId("");
      setToAccountId("");
      // Call onDone after all state updates are registered (next microtask)
      Promise.resolve().then(() => onDone());
      return;
    }

    // ── Expense / Income flow ───────────────────────────────────────────────────
    // For expenses, category is required; for income, default to "Others"
    let finalSubCategory = subCategory;
    let finalMainCategory = "Income";

    if (type === "expense") {
      if (!subCategory) {
        toast.error(`${t("category")} is required`);
        return;
      }
      finalMainCategory = mainCat ?? customCategories[0]?.name ?? "Needs";
      finalSubCategory = subCategory;

      // Split expense validation
      if (splitEnabled) {
        const splitShare = Number.parseFloat(splitAmount);
        if (!splitPersonName.trim()) {
          toast.error("Enter the other person's name for split");
          return;
        }
        if (!splitShare || splitShare <= 0 || splitShare >= num) {
          toast.error(
            "Their share must be greater than 0 and less than the total amount",
          );
          return;
        }
      }

      const budget = getBudgetForCategory(finalMainCategory);
      const spent = getSpentForSubCategory(finalSubCategory);
      if (spent + num > budget) {
        toast.warning(t("overspendWarning"), {
          duration: 4000,
          icon: <AlertTriangle size={16} />,
        });
      }
    } else {
      // income — use selected chip or "Others"
      finalSubCategory = subCategory || "Others";
      finalMainCategory = "Income";
    }

    // Resolve account field — supports both parent accounts and sub-accounts
    // Sub-account format: "parentId>subId", stored as-is in transaction.account
    let resolvedAccount: string | undefined = undefined;
    if (selectedAccountId) {
      if (selectedAccountId.includes(">")) {
        // Sub-account: use the parentId>subId key directly as the account field
        resolvedAccount = selectedAccountId;
      } else {
        // Parent account: resolve to account name
        const selectedAcc = accounts.find((a) => a.id === selectedAccountId);
        resolvedAccount = selectedAcc?.name;
      }
    }

    // ── Split expense flow ─────────────────────────────────────────────────────
    if (type === "expense" && splitEnabled) {
      const splitShare = Number.parseFloat(splitAmount);
      const yourShare = num - splitShare;

      // Log expense only for your share — capture the returned tx for cross-referencing
      const splitTx = addTransaction({
        amount: yourShare,
        date,
        mainCategory: finalMainCategory,
        subCategory: finalSubCategory,
        description: description
          ? `${description} (your share)`
          : `${finalSubCategory} (your share)`,
        type: "expense",
        account: resolvedAccount,
      });

      // Debit account for the FULL amount (so CC balance matches statement)
      if (selectedAccountId) {
        const parentId = selectedAccountId.includes(">")
          ? selectedAccountId.split(">")[0]
          : selectedAccountId;
        debitAccount(parentId, num);
      }

      // Auto-create IOU (Lent) for the other person's share — returns the new IOU
      const newIOU = addIOU(
        {
          personName: splitPersonName.trim(),
          amountLent: splitShare,
          dateLent: date,
          dueDate: date,
          direction: "lent",
          linkedTransactionId: splitTx?.id, // cross-reference set at creation time
        },
        undefined, // no additional account debit — already debited full amount above
      );

      // Cross-reference: update transaction to point back to the IOU
      if (splitTx?.id && newIOU?.id) {
        updateTransaction(splitTx.id, { linkedIOUId: newIOU.id });
        // No separate updateIOU needed — linkedTransactionId already set above
      }

      toast.success(
        `Split recorded! You paid ₱${yourShare.toLocaleString()}, IOU for ₱${splitShare.toLocaleString()} created.`,
      );
      setAmount("");
      setDescription("");
      setSubCategory("");
      setSelectedAccountId("");
      setSplitEnabled(false);
      setSplitPersonName("");
      setSplitAmount("");
      Promise.resolve().then(() => onDone());
      return;
    }

    addTransaction({
      amount: num,
      date,
      mainCategory: finalMainCategory,
      subCategory: finalSubCategory,
      description,
      type,
      account: resolvedAccount,
    });

    // Update account balance using the UUID directly (functional updater — no stale closure)
    if (selectedAccountId) {
      // For sub-accounts, debit/credit the parent account balance
      const parentId = selectedAccountId.includes(">")
        ? selectedAccountId.split(">")[0]
        : selectedAccountId;
      if (type === "income") {
        creditAccount(parentId, num);
      } else if (type === "expense") {
        debitAccount(parentId, num);
      }
    }

    toast.success("Transaction added!");
    setAmount("");
    setDescription("");
    setSubCategory("");
    setSelectedAccountId("");
    // Delay navigation so state updates flush before unmount
    Promise.resolve().then(() => onDone());
  };

  return (
    <div className="pb-24 px-4 pt-2 fade-in">
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-xl font-bold text-foreground flex-1">
          {t("addTransaction")}
        </h1>
        <HelpSheet
          section="addTransaction"
          language={config?.language ?? "en"}
        />
      </div>

      <div
        className="rounded-2xl border border-border p-5 mb-4"
        style={{ backgroundColor: "oklch(var(--card))" }}
      >
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              setType("expense");
              setSubCategory("");
              setSelectedGoalId("");
              setToAccountId("");
            }}
            className="flex-1 py-2 rounded-xl font-semibold text-sm transition-all"
            style={{
              backgroundColor:
                type === "expense" ? "#EB5757" : "oklch(var(--secondary))",
              color:
                type === "expense" ? "#fff" : "oklch(var(--muted-foreground))",
            }}
            data-ocid="add_transaction.expense.toggle"
          >
            {t("expense")}
          </button>
          <button
            type="button"
            onClick={() => {
              setType("income");
              setSubCategory("");
              setSelectedGoalId("");
              setToAccountId("");
            }}
            className="flex-1 py-2 rounded-xl font-semibold text-sm transition-all"
            style={{
              backgroundColor:
                type === "income"
                  ? "oklch(var(--primary))"
                  : "oklch(var(--secondary))",
              color:
                type === "income"
                  ? "oklch(var(--primary-foreground))"
                  : "oklch(var(--muted-foreground))",
            }}
            data-ocid="add_transaction.income.toggle"
          >
            {t("income")}
          </button>
          {goals.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setType("saveToGoal");
                setSubCategory("");
              }}
              className="flex-1 py-2 rounded-xl font-semibold text-sm transition-all"
              style={{
                backgroundColor:
                  type === "saveToGoal" ? "#8B5CF6" : "oklch(var(--secondary))",
                color:
                  type === "saveToGoal"
                    ? "#fff"
                    : "oklch(var(--muted-foreground))",
              }}
              data-ocid="add_transaction.save_to_goal.toggle"
            >
              To Goal
            </button>
          )}
        </div>

        {/* Amount + Date */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <Label htmlFor="amount">{t("amount")}</Label>
            {!showCalc ? (
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onFocus={() => setShowCalc(true)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="mt-1"
                data-ocid="add_transaction.amount.input"
                readOnly
              />
            ) : (
              <button
                type="button"
                className="mt-1 rounded-xl border border-border p-1 cursor-pointer w-full text-left"
                onClick={() => setShowCalc(true)}
                style={{ backgroundColor: "oklch(var(--secondary))" }}
              >
                <div className="text-right px-2 py-1 min-h-[36px] flex items-center justify-end">
                  <span className="text-base font-bold text-foreground">
                    {calcResult || calcExpression || "0"}
                  </span>
                </div>
              </button>
            )}
          </div>
          <div>
            <Label htmlFor="txdate">{t("date")}</Label>
            <Input
              id="txdate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
              data-ocid="add_transaction.date.input"
            />
          </div>
        </div>

        {/* Calculator Keypad */}
        {showCalc && (
          <div
            className="rounded-2xl border border-border p-3 mb-4"
            style={{ backgroundColor: "oklch(var(--secondary))" }}
            data-ocid="add_transaction.calculator.panel"
          >
            <div
              className="text-right px-3 py-2 rounded-xl mb-2 min-h-[44px] flex items-center justify-end"
              style={{ backgroundColor: "oklch(var(--card))" }}
            >
              <span className="text-lg font-bold text-foreground">
                {calcResult ? (
                  <span style={{ color: "oklch(var(--primary))" }}>
                    {calcResult}
                  </span>
                ) : (
                  calcExpression || (
                    <span className="text-muted-foreground text-sm">
                      tap to enter amount
                    </span>
                  )
                )}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                "7",
                "8",
                "9",
                "÷",
                "4",
                "5",
                "6",
                "×",
                "1",
                "2",
                "3",
                "−",
                ".",
                "0",
                "⌫",
                "+",
              ].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleCalcButton(key === "−" ? "-" : key)}
                  className="h-11 rounded-xl text-sm font-semibold transition-all active:scale-95"
                  style={{
                    backgroundColor: ["÷", "×", "−", "+"].includes(key)
                      ? "oklch(var(--primary) / 0.2)"
                      : "oklch(var(--card))",
                    color: ["÷", "×", "−", "+"].includes(key)
                      ? "oklch(var(--primary))"
                      : "oklch(var(--foreground))",
                  }}
                  data-ocid="add_transaction.calc.button"
                >
                  {key}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleCalcButton("=")}
                className="h-11 rounded-xl text-sm font-semibold col-span-2 transition-all active:scale-95"
                style={{
                  backgroundColor: "oklch(var(--secondary))",
                  color: "oklch(var(--foreground))",
                  border: "1px solid oklch(var(--border))",
                }}
                data-ocid="add_transaction.calc_equals.button"
              >
                =
              </button>
              <button
                type="button"
                onClick={() => handleCalcButton("✓")}
                className="h-11 rounded-xl text-sm font-bold col-span-2 transition-all active:scale-95"
                style={{
                  backgroundColor: "oklch(var(--primary))",
                  color: "oklch(var(--primary-foreground))",
                }}
                data-ocid="add_transaction.calc_confirm.button"
              >
                ✓ Use
              </button>
            </div>
          </div>
        )}

        {/* ── Save to Goal form ─────────────────────────────────────────── */}
        {type === "saveToGoal" && (
          <>
            {/* Goal selector */}
            <div className="mb-4">
              <Label>Goal</Label>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {goals.map((goal) => (
                  <button
                    type="button"
                    key={goal.id}
                    onClick={() =>
                      setSelectedGoalId(
                        selectedGoalId === goal.id ? "" : goal.id,
                      )
                    }
                    className="flex items-center justify-between p-3 rounded-xl border text-left transition-all"
                    style={{
                      backgroundColor:
                        selectedGoalId === goal.id
                          ? "#8B5CF622"
                          : "oklch(var(--secondary))",
                      borderColor:
                        selectedGoalId === goal.id
                          ? "#8B5CF6"
                          : "oklch(var(--border))",
                    }}
                    data-ocid="add_transaction.goal.toggle"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {goal.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {goal.subCategoryName}
                      </p>
                    </div>
                    {selectedGoalId === goal.id && (
                      <span
                        className="text-xs font-bold"
                        style={{ color: "#8B5CF6" }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* From Account — required */}
            <div className="mb-4">
              <Label>
                From Account <span className="text-destructive">*</span>
              </Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {accounts.map((acc) => (
                  <button
                    type="button"
                    key={acc.id}
                    onClick={() =>
                      setSelectedAccountId(
                        selectedAccountId === acc.id ? "" : acc.id,
                      )
                    }
                    className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                    style={{
                      backgroundColor:
                        selectedAccountId === acc.id
                          ? "#8B5CF622"
                          : "transparent",
                      borderColor:
                        selectedAccountId === acc.id
                          ? "#8B5CF6"
                          : "oklch(var(--border))",
                      color:
                        selectedAccountId === acc.id
                          ? "#8B5CF6"
                          : "oklch(var(--foreground))",
                    }}
                    data-ocid="add_transaction.from_account.toggle"
                  >
                    {acc.name}
                  </button>
                ))}
              </div>
            </div>

            {/* To Account — optional */}
            <div className="mb-4">
              <Label>
                To Account{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (optional — where money physically moves)
                </span>
              </Label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setToAccountId("")}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                  style={{
                    backgroundColor:
                      toAccountId === ""
                        ? "oklch(var(--secondary))"
                        : "transparent",
                    borderColor: "oklch(var(--border))",
                    color: "oklch(var(--muted-foreground))",
                  }}
                  data-ocid="add_transaction.to_account_none.toggle"
                >
                  None
                </button>
                {accounts.map((acc) => (
                  <button
                    type="button"
                    key={acc.id}
                    onClick={() =>
                      setToAccountId(toAccountId === acc.id ? "" : acc.id)
                    }
                    className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                    style={{
                      backgroundColor:
                        toAccountId === acc.id
                          ? "oklch(var(--primary) / 0.15)"
                          : "transparent",
                      borderColor:
                        toAccountId === acc.id
                          ? "oklch(var(--primary))"
                          : "oklch(var(--border))",
                      color:
                        toAccountId === acc.id
                          ? "oklch(var(--primary))"
                          : "oklch(var(--foreground))",
                    }}
                    data-ocid="add_transaction.to_account.toggle"
                  >
                    {acc.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <Label htmlFor="desc-goal">{t("description")}</Label>
              <Input
                id="desc-goal"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                className="mt-1"
                data-ocid="add_transaction.description.input"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              className="w-full mt-2"
              style={{
                backgroundColor: "#8B5CF6",
                color: "#fff",
              }}
              data-ocid="add_transaction.submit.button"
            >
              Save to Goal
            </Button>
          </>
        )}

        {/* ── Expense / Income form ─────────────────────────────────────────── */}
        {type !== "saveToGoal" && (
          <>
            {/* Category section — differs for expense vs income */}
            {type === "expense" ? (
              <div>
                <Label>{t("category")}</Label>
                {showSuggestion && (
                  <button
                    type="button"
                    className="mt-1 mb-2 p-2 rounded-lg text-xs flex items-center gap-2 cursor-pointer w-full text-left"
                    style={{
                      backgroundColor: "oklch(var(--primary) / 0.15)",
                      color: "oklch(var(--primary))",
                    }}
                    onClick={() => {
                      setSubCategory(showSuggestion);
                      setShowSuggestion(null);
                    }}
                  >
                    <span>
                      💡 Suggested: <strong>{showSuggestion}</strong> — tap to
                      apply
                    </span>
                  </button>
                )}
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {customCategories.map((cat) => (
                    <div key={cat.id}>
                      <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1 px-1">
                        {cat.name}
                      </div>
                      {cat.subCategories.map((sub) => {
                        const effectiveColor = sub.color ?? cat.color;
                        return (
                          <button
                            type="button"
                            key={sub.id}
                            onClick={() => setSubCategory(sub.name)}
                            className="w-full flex items-center gap-2 p-2 rounded-lg mb-1 text-left transition-all"
                            style={{
                              backgroundColor:
                                subCategory === sub.name
                                  ? `${effectiveColor}22`
                                  : "oklch(var(--secondary))",
                              borderWidth: 1,
                              borderStyle: "solid",
                              borderColor:
                                subCategory === sub.name
                                  ? effectiveColor
                                  : "transparent",
                            }}
                            data-ocid="add_transaction.category.toggle"
                          >
                            <CategoryIcon
                              iconName={sub.icon}
                              badgeColor={effectiveColor}
                              size={14}
                            />
                            <span className="text-xs text-foreground truncate">
                              {sub.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <Label>Income Source</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {incomeSourceChips.map((chip) => (
                    <button
                      type="button"
                      key={chip}
                      onClick={() =>
                        setSubCategory(subCategory === chip ? "" : chip)
                      }
                      className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                      style={{
                        backgroundColor:
                          subCategory === chip
                            ? "oklch(var(--primary))"
                            : "oklch(var(--secondary))",
                        color:
                          subCategory === chip
                            ? "oklch(var(--primary-foreground))"
                            : "oklch(var(--foreground))",
                        borderColor:
                          subCategory === chip
                            ? "oklch(var(--primary))"
                            : "oklch(var(--border))",
                      }}
                      data-ocid="add_transaction.income_source.toggle"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <Label htmlFor="desc">{t("description")}</Label>
              <Input
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                className="mt-1"
                data-ocid="add_transaction.description.input"
              />
            </div>

            {/* Account selector */}
            <div className="mt-4">
              <Label>
                Account{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (optional)
                </span>
              </Label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAccountId("")}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                  style={{
                    backgroundColor:
                      selectedAccountId === ""
                        ? "oklch(var(--secondary))"
                        : "transparent",
                    borderColor: "oklch(var(--border))",
                    color: "oklch(var(--muted-foreground))",
                  }}
                  data-ocid="add_transaction.account.toggle"
                >
                  None
                </button>
                {accounts.map((acc) => (
                  <div key={acc.id} className="flex flex-wrap gap-2">
                    {/* Parent account button */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAccountId(
                          selectedAccountId === acc.id ? "" : acc.id,
                        )
                      }
                      className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                      style={{
                        backgroundColor:
                          selectedAccountId === acc.id
                            ? "oklch(var(--primary) / 0.15)"
                            : "transparent",
                        borderColor:
                          selectedAccountId === acc.id
                            ? "oklch(var(--primary))"
                            : "oklch(var(--border))",
                        color:
                          selectedAccountId === acc.id
                            ? "oklch(var(--primary))"
                            : "oklch(var(--foreground))",
                      }}
                      data-ocid="add_transaction.account.toggle"
                    >
                      {acc.name}
                    </button>
                    {/* Sub-account buttons */}
                    {(acc.subAccounts ?? []).map((sub) => {
                      const subKey = `${acc.id}>${sub.id}`;
                      return (
                        <button
                          type="button"
                          key={sub.id}
                          onClick={() =>
                            setSelectedAccountId(
                              selectedAccountId === subKey ? "" : subKey,
                            )
                          }
                          className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                          style={{
                            backgroundColor:
                              selectedAccountId === subKey
                                ? "oklch(var(--primary) / 0.15)"
                                : "transparent",
                            borderColor:
                              selectedAccountId === subKey
                                ? "oklch(var(--primary))"
                                : "oklch(var(--border))",
                            color:
                              selectedAccountId === subKey
                                ? "oklch(var(--primary))"
                                : "oklch(var(--muted-foreground))",
                          }}
                          data-ocid="add_transaction.account.toggle"
                        >
                          {acc.name} &rsaquo; {sub.name}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Split Expense Toggle — only for expenses */}
            {type === "expense" && (
              <div className="mt-4 mb-2">
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm text-foreground"
                  onClick={() => setSplitEnabled((prev) => !prev)}
                  data-ocid="add_transaction.split.toggle"
                >
                  <div
                    className="w-4 h-4 rounded border flex items-center justify-center"
                    style={{
                      backgroundColor: splitEnabled
                        ? "oklch(var(--primary))"
                        : "transparent",
                      borderColor: splitEnabled
                        ? "oklch(var(--primary))"
                        : "oklch(var(--border))",
                    }}
                  >
                    {splitEnabled && (
                      <span className="text-[10px] text-white font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  Split with someone
                </button>
                {splitEnabled && (
                  <div
                    className="mt-2 p-3 rounded-xl border border-border space-y-2"
                    style={{ backgroundColor: "oklch(var(--secondary) / 0.5)" }}
                    data-ocid="add_transaction.split.panel"
                  >
                    <div>
                      <Label className="text-xs">Other person's name</Label>
                      <Input
                        value={splitPersonName}
                        onChange={(e) => setSplitPersonName(e.target.value)}
                        placeholder="e.g. Maria"
                        className="mt-1 h-8 text-sm"
                        data-ocid="add_transaction.split_person.input"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Their share (₱)</Label>
                      <Input
                        type="number"
                        value={splitAmount}
                        onChange={(e) => setSplitAmount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="mt-1 h-8 text-sm"
                        data-ocid="add_transaction.split_amount.input"
                      />
                    </div>
                    {amount &&
                      splitAmount &&
                      Number(splitAmount) > 0 &&
                      Number(splitAmount) < Number(amount) && (
                        <p className="text-[11px] text-muted-foreground">
                          You'll be charged ₱
                          {(
                            Number(amount) - Number(splitAmount)
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          . An IOU will be created for ₱
                          {Number(splitAmount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          .
                        </p>
                      )}
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              className="w-full mt-4"
              style={{
                backgroundColor: "oklch(var(--primary))",
                color: "oklch(var(--primary-foreground))",
              }}
              data-ocid="add_transaction.submit.button"
            >
              {t("addTransaction")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
