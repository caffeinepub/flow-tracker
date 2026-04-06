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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from "date-fns";
import { Download, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Tab } from "../components/BottomNav";
import { CategoryIcon } from "../components/CategoryIcon";
import { HelpSheet } from "../components/HelpSheet";
import { formatAmount } from "../data/categories";
import { useFinanceData } from "../hooks/useFinanceData";
import { useTranslation } from "../hooks/useTranslation";
import type { Transaction, TransactionType } from "../types";
import { Reports } from "./Reports";

interface HistoryProps {
  onNavigate?: (tab: Tab) => void;
  privacyMode?: boolean;
}

type PeriodFilter = "all" | "current" | string; // string = period id

interface EditState {
  id: string;
  amount: string;
  date: string;
  type: TransactionType;
  mainCategory: string;
  subCategory: string;
  description: string;
  account: string;
}

export function History({
  onNavigate: _onNavigate,
  privacyMode = false,
}: HistoryProps) {
  const t = useTranslation();
  const {
    config,
    customCategories,
    transactions,
    currentTransactions,
    periods,
    accounts,
    updateTransaction,
    deleteTransaction,
    exportCSV,
    getMainCatForSub,
    creditAccount,
    debitAccount,
    ious,
    updateIOU,
  } = useFinanceData();
  const currency = config?.currency ?? "PHP";
  const pAmt = (val: number) =>
    privacyMode ? "••••••" : formatAmount(val, currency);

  // Period filter
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("current");
  // Category filters
  const [filterMain, setFilterMain] = useState<string>("All");
  const [filterSub, setFilterSub] = useState<string>("All");
  const [search, setSearch] = useState("");
  // Dialog states
  const [editTx, setEditTx] = useState<EditState | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Split expense total-change prompt state
  const [splitTotalBillChanged, setSplitTotalBillChanged] = useState<
    boolean | null
  >(null);
  const [splitNewTotal, setSplitNewTotal] = useState("");

  // Resolve which transactions to show based on period filter
  const filteredByPeriod = (() => {
    if (periodFilter === "current") return currentTransactions;
    if (periodFilter === "all") {
      // All transactions: combine current + archived periods (deduplicated by id)
      const seen = new Set<string>();
      const all: Transaction[] = [];
      for (const tx of transactions) {
        if (!seen.has(tx.id)) {
          seen.add(tx.id);
          all.push(tx);
        }
      }
      for (const period of periods) {
        for (const tx of period.transactions) {
          if (!seen.has(tx.id)) {
            seen.add(tx.id);
            all.push(tx);
          }
        }
      }
      return all.sort((a, b) => b.date.localeCompare(a.date));
    }
    // Specific archived period
    const period = periods.find((p) => p.id === periodFilter);
    return period
      ? [...period.transactions].sort((a, b) => b.date.localeCompare(a.date))
      : [];
  })();

  // Apply category + search filters
  const filtered = filteredByPeriod.filter((tx) => {
    if (filterMain === "__income__") {
      // Show only income transactions (exclude transfers)
      if (tx.type !== "income" || tx.mainCategory === "Transfer") return false;
    } else if (filterMain === "Transfer") {
      // Show only transfer transactions
      if (tx.mainCategory !== "Transfer") return false;
    } else if (filterMain !== "All") {
      if (tx.mainCategory !== filterMain) return false;
    }
    if (filterSub !== "All" && tx.subCategory !== filterSub) return false;
    if (
      search &&
      !tx.description.toLowerCase().includes(search.toLowerCase()) &&
      !tx.subCategory.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const selectedCat = customCategories.find((c) => c.name === filterMain);
  const subCatsForFilter = selectedCat?.subCategories ?? [];

  const getSubInfo = (tx: Transaction) => {
    const cat = customCategories.find((c) => c.name === tx.mainCategory);
    const sub = cat?.subCategories.find((s) => s.name === tx.subCategory);
    return {
      icon: sub?.icon ?? "Tag",
      color: sub?.color ?? cat?.color ?? "#888",
    };
  };

  const openEdit = (tx: Transaction) => {
    setSplitTotalBillChanged(null);
    setSplitNewTotal("");
    setEditTx({
      id: tx.id,
      amount: tx.amount.toString(),
      date: tx.date,
      type: tx.type,
      mainCategory: tx.mainCategory,
      subCategory: tx.subCategory,
      description: tx.description,
      account: tx.account ?? "",
    });
  };

  const handleSaveEdit = () => {
    if (!editTx) return;
    const num = Number.parseFloat(editTx.amount);
    if (!num || num <= 0) {
      toast.error("Amount must be positive");
      return;
    }
    const resolvedMain = editTx.subCategory
      ? (getMainCatForSub(editTx.subCategory) ?? editTx.mainCategory)
      : editTx.mainCategory;

    // Reverse the old transaction's balance effect
    const origTx = transactions.find((tx) => tx.id === editTx.id);
    if (origTx?.account) {
      const origAcc = accounts.find((a) => a.name === origTx.account);
      if (origAcc) {
        if (origTx.type === "expense") {
          // Expense was debited — credit back the original amount
          creditAccount(origAcc.id, Number(origTx.amount));
        } else if (origTx.type === "income") {
          // Income was credited — debit back the original amount
          debitAccount(origAcc.id, Number(origTx.amount));
        }
      }
    }

    // Apply the new transaction's balance effect
    if (editTx.account) {
      const newAcc = accounts.find((a) => a.name === editTx.account);
      if (newAcc) {
        if (editTx.type === "expense") {
          debitAccount(newAcc.id, num);
        } else if (editTx.type === "income") {
          creditAccount(newAcc.id, num);
        }
      }
    }

    updateTransaction(editTx.id, {
      amount: num,
      date: editTx.date,
      type: editTx.type,
      mainCategory: resolvedMain,
      subCategory: editTx.subCategory,
      description: editTx.description,
      account: editTx.account || undefined,
    });

    // If this was a split expense, update the linked IOU amount
    const origTxForIOU = transactions.find((tx) => tx.id === editTx.id);
    if (origTxForIOU?.linkedIOUId) {
      const linkedIOU = ious.find((iou) => iou.id === origTxForIOU.linkedIOUId);
      if (linkedIOU) {
        const amountChanged = num !== Number(origTxForIOU.amount);
        if (amountChanged) {
          // Require user confirmation before changing the IOU
          if (splitTotalBillChanged === null) {
            toast.error("Please confirm whether the total bill changed");
            return;
          }
          const originalTotal =
            linkedIOU.amountLent + Number(origTxForIOU.amount);
          let newIouAmount: number;
          if (splitTotalBillChanged === true) {
            const newTotal = Number(splitNewTotal);
            if (!newTotal || newTotal <= 0) {
              toast.error("Please enter the new total amount");
              return;
            }
            newIouAmount = newTotal - num;
          } else {
            // Same total — IOU absorbs the difference
            newIouAmount = originalTotal - num;
          }
          if (newIouAmount <= 0) {
            toast.error("Their share cannot be zero or negative");
            return;
          }
          updateIOU(origTxForIOU.linkedIOUId, { amountLent: newIouAmount });
        }
      }
    }

    toast.success("Transaction updated");
    setSplitTotalBillChanged(null);
    setSplitNewTotal("");
    setEditTx(null);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    // deleteTransaction already handles balance reversal internally
    deleteTransaction(deleteId);
    setDeleteId(null);
    toast.success("Transaction deleted");
  };

  // Period label helpers
  const periodLabel = (id: string) => {
    const p = periods.find((x) => x.id === id);
    if (!p) return id;
    try {
      return `${format(parseISO(p.startDate), "MMM d")} \u2013 ${format(parseISO(p.endDate), "MMM d")}`;
    } catch {
      return id;
    }
  };

  // Account options for edit dialog
  const accountOptions = [
    { id: "", name: "None" },
    ...accounts.map((a) => ({ id: a.name, name: a.name })),
  ];

  return (
    <div className="pb-24 fade-in">
      <Tabs defaultValue="transactions" className="w-full">
        <div className="px-4 pt-2">
          <div className="flex items-center gap-2 mb-4">
            <TabsList className="flex-1">
              <TabsTrigger
                value="transactions"
                className="flex-1"
                data-ocid="history.transactions.tab"
              >
                Transactions
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="flex-1"
                data-ocid="history.reports.tab"
              >
                Reports
              </TabsTrigger>
            </TabsList>
            <HelpSheet section="history" language={config?.language ?? "en"} />
          </div>
        </div>

        <TabsContent value="transactions" className="mt-0">
          <div className="px-4">
            {/* Period filter chips */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setPeriodFilter("all")}
                className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor:
                    periodFilter === "all"
                      ? "oklch(var(--primary))"
                      : "oklch(var(--secondary))",
                  color:
                    periodFilter === "all"
                      ? "oklch(var(--primary-foreground))"
                      : "oklch(var(--muted-foreground))",
                }}
                data-ocid="history.period_all.toggle"
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter("current")}
                className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor:
                    periodFilter === "current"
                      ? "oklch(var(--primary))"
                      : "oklch(var(--secondary))",
                  color:
                    periodFilter === "current"
                      ? "oklch(var(--primary-foreground))"
                      : "oklch(var(--muted-foreground))",
                }}
                data-ocid="history.period_current.toggle"
              >
                Current
              </button>
              {periods.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPeriodFilter(p.id)}
                  className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap"
                  style={{
                    backgroundColor:
                      periodFilter === p.id
                        ? "oklch(var(--primary))"
                        : "oklch(var(--secondary))",
                    color:
                      periodFilter === p.id
                        ? "oklch(var(--primary-foreground))"
                        : "oklch(var(--muted-foreground))",
                  }}
                  data-ocid="history.period.toggle"
                >
                  {periodLabel(p.id)}
                </button>
              ))}
            </div>

            {/* Search bar + CSV export */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-sm border border-border bg-card text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
                data-ocid="history.search.input"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={exportCSV}
                className="gap-1 flex-shrink-0"
                data-ocid="history.export.button"
              >
                <Download size={14} />
                CSV
              </Button>
            </div>

            {/* Category filter chips */}
            <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setFilterMain("All");
                  setFilterSub("All");
                }}
                className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor:
                    filterMain === "All"
                      ? "oklch(var(--primary))"
                      : "oklch(var(--secondary))",
                  color:
                    filterMain === "All"
                      ? "oklch(var(--primary-foreground))"
                      : "oklch(var(--muted-foreground))",
                }}
                data-ocid="history.filter_all.toggle"
              >
                {t("filterAll")}
              </button>
              {customCategories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => {
                    setFilterMain(cat.name);
                    setFilterSub("All");
                  }}
                  className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor:
                      filterMain === cat.name
                        ? cat.color
                        : "oklch(var(--secondary))",
                    color:
                      filterMain === cat.name
                        ? "#fff"
                        : "oklch(var(--muted-foreground))",
                  }}
                  data-ocid="history.filter_category.toggle"
                >
                  {cat.name}
                </button>
              ))}
              {/* Special chips: Income and Transfer */}
              <button
                type="button"
                onClick={() => {
                  setFilterMain("__income__");
                  setFilterSub("All");
                }}
                className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all border"
                style={{
                  backgroundColor:
                    filterMain === "__income__"
                      ? "#20D18A"
                      : "oklch(var(--secondary))",
                  color:
                    filterMain === "__income__"
                      ? "#000"
                      : "oklch(var(--muted-foreground))",
                  borderColor:
                    filterMain === "__income__"
                      ? "#20D18A"
                      : "oklch(var(--border))",
                }}
                data-ocid="history.filter_income.toggle"
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMain("Transfer");
                  setFilterSub("All");
                }}
                className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all border"
                style={{
                  backgroundColor:
                    filterMain === "Transfer"
                      ? "#6366F1"
                      : "oklch(var(--secondary))",
                  color:
                    filterMain === "Transfer"
                      ? "#fff"
                      : "oklch(var(--muted-foreground))",
                  borderColor:
                    filterMain === "Transfer"
                      ? "#6366F1"
                      : "oklch(var(--border))",
                }}
                data-ocid="history.filter_transfer.toggle"
              >
                Transfer
              </button>
            </div>

            {subCatsForFilter.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setFilterSub("All")}
                  className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor:
                      filterSub === "All"
                        ? "oklch(var(--primary))"
                        : "oklch(var(--secondary))",
                    color:
                      filterSub === "All"
                        ? "oklch(var(--primary-foreground))"
                        : "oklch(var(--muted-foreground))",
                  }}
                >
                  All
                </button>
                {subCatsForFilter.map((sub) => (
                  <button
                    type="button"
                    key={sub.id}
                    onClick={() => setFilterSub(sub.name)}
                    className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
                    style={{
                      backgroundColor:
                        filterSub === sub.name
                          ? "oklch(var(--primary))"
                          : "oklch(var(--secondary))",
                      color:
                        filterSub === sub.name
                          ? "oklch(var(--primary-foreground))"
                          : "oklch(var(--muted-foreground))",
                    }}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}

            {/* Summary line */}
            <p className="text-xs text-muted-foreground mb-3">
              {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
              {periodFilter === "all"
                ? " (all time)"
                : periodFilter === "current"
                  ? " (current period)"
                  : ` (${periodLabel(periodFilter)})`}
            </p>
          </div>

          {/* Transaction list */}
          <div className="px-4 space-y-2">
            {filtered.length === 0 ? (
              <div
                className="text-center py-16"
                data-ocid="history.transactions.empty_state"
              >
                <div className="text-4xl mb-3">🧧</div>
                <p className="text-muted-foreground text-sm">
                  {t("noTransactions")}
                </p>
              </div>
            ) : (
              filtered.map((tx, idx) => {
                const { icon, color } = getSubInfo(tx);
                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-2 p-3 rounded-xl border border-border"
                    style={{ backgroundColor: "oklch(var(--card))" }}
                    data-ocid={`history.transaction.item.${idx + 1}`}
                  >
                    <CategoryIcon
                      iconName={icon}
                      badgeColor={color}
                      size={16}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {tx.description || tx.subCategory}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tx.subCategory && `${tx.subCategory} \u00b7 `}
                            {format(parseISO(tx.date), "MMM d, yyyy")}
                            {tx.account && (
                              <span className="ml-1 opacity-70">
                                \u00b7 {tx.account}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          <span
                            className="text-sm font-bold"
                            style={{
                              color:
                                tx.type === "income"
                                  ? "oklch(var(--primary))"
                                  : "#EB5757",
                            }}
                          >
                            {tx.type === "income" ? "+" : "-"}
                            {pAmt(tx.amount)}
                          </span>
                          {/* Type badge */}
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor:
                                tx.type === "income"
                                  ? "oklch(var(--primary) / 0.15)"
                                  : "#EB575720",
                              color:
                                tx.type === "income"
                                  ? "oklch(var(--primary))"
                                  : "#EB5757",
                            }}
                          >
                            {tx.type === "income" ? "In" : "Out"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(tx)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        style={{ backgroundColor: "oklch(var(--secondary))" }}
                        aria-label="Edit transaction"
                        data-ocid={`history.transaction.edit_button.${idx + 1}`}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(tx.id)}
                        className="p-1.5 rounded-lg"
                        style={{
                          backgroundColor: "#EB575722",
                          color: "#EB5757",
                        }}
                        aria-label="Delete transaction"
                        data-ocid={`history.transaction.delete_button.${idx + 1}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-0">
          <div className="pb-0">
            <Reports />
          </div>
        </TabsContent>
      </Tabs>
      <Dialog
        open={!!editTx}
        onOpenChange={(o) => {
          if (!o) {
            setSplitTotalBillChanged(null);
            setSplitNewTotal("");
            setEditTx(null);
          }
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto"
          data-ocid="history.edit.dialog"
        >
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          {editTx && (
            <div className="space-y-4">
              {/* Type toggle */}
              <div>
                <Label>Type</Label>
                <div className="flex gap-2 mt-1">
                  {(["expense", "income"] as TransactionType[]).map((tp) => (
                    <button
                      type="button"
                      key={tp}
                      onClick={() =>
                        setEditTx((prev) =>
                          prev ? { ...prev, type: tp } : prev,
                        )
                      }
                      className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        backgroundColor:
                          editTx.type === tp
                            ? tp === "expense"
                              ? "#EB5757"
                              : "oklch(var(--primary))"
                            : "oklch(var(--secondary))",
                        color:
                          editTx.type === tp
                            ? "#fff"
                            : "oklch(var(--muted-foreground))",
                      }}
                      data-ocid={`history.edit.type_${tp}.toggle`}
                    >
                      {tp.charAt(0).toUpperCase() + tp.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <Label htmlFor="edit-amount">Amount</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={editTx.amount}
                  onChange={(e) =>
                    setEditTx((prev) =>
                      prev ? { ...prev, amount: e.target.value } : prev,
                    )
                  }
                  min="0"
                  step="0.01"
                  className="mt-1"
                  data-ocid="history.edit.amount.input"
                />
              </div>

              {/* Date */}
              <div>
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editTx.date}
                  onChange={(e) =>
                    setEditTx((prev) =>
                      prev ? { ...prev, date: e.target.value } : prev,
                    )
                  }
                  className="mt-1"
                  data-ocid="history.edit.date.input"
                />
              </div>

              {/* Category picker */}
              <div>
                <Label>Category</Label>
                <div className="mt-1 grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                  {customCategories.map((cat) => (
                    <div key={cat.id}>
                      <div className="text-[9px] font-bold uppercase text-muted-foreground mb-0.5 px-1">
                        {cat.name}
                      </div>
                      {cat.subCategories.map((sub) => {
                        const effectiveColor = sub.color ?? cat.color;
                        return (
                          <button
                            type="button"
                            key={sub.id}
                            onClick={() =>
                              setEditTx((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      subCategory: sub.name,
                                      mainCategory: cat.name,
                                    }
                                  : prev,
                              )
                            }
                            className="w-full flex items-center gap-1.5 p-1.5 rounded-lg mb-0.5 text-left transition-all"
                            style={{
                              backgroundColor:
                                editTx.subCategory === sub.name
                                  ? `${effectiveColor}22`
                                  : "oklch(var(--secondary))",
                              borderWidth: 1,
                              borderStyle: "solid",
                              borderColor:
                                editTx.subCategory === sub.name
                                  ? effectiveColor
                                  : "transparent",
                            }}
                          >
                            <CategoryIcon
                              iconName={sub.icon}
                              badgeColor={effectiveColor}
                              size={10}
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

              {/* Description */}
              <div>
                <Label htmlFor="edit-desc">Description</Label>
                <Input
                  id="edit-desc"
                  value={editTx.description}
                  onChange={(e) =>
                    setEditTx((prev) =>
                      prev ? { ...prev, description: e.target.value } : prev,
                    )
                  }
                  className="mt-1"
                  data-ocid="history.edit.description.input"
                />
              </div>

              {/* Account (optional) */}
              <div>
                <Label>
                  Account{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    (optional)
                  </span>
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {accountOptions.map((acc) => (
                    <button
                      type="button"
                      key={acc.id}
                      onClick={() =>
                        setEditTx((prev) =>
                          prev
                            ? {
                                ...prev,
                                account: prev.account === acc.id ? "" : acc.id,
                              }
                            : prev,
                        )
                      }
                      className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
                      style={{
                        backgroundColor:
                          editTx.account === acc.id
                            ? "oklch(var(--primary) / 0.15)"
                            : "transparent",
                        borderColor:
                          editTx.account === acc.id
                            ? "oklch(var(--primary))"
                            : "oklch(var(--border))",
                        color:
                          editTx.account === acc.id
                            ? "oklch(var(--primary))"
                            : "oklch(var(--foreground))",
                      }}
                      data-ocid="history.edit.account.toggle"
                    >
                      {acc.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Split expense total change prompt */}
              {(() => {
                const origTx = transactions.find((tx) => tx.id === editTx?.id);
                const linkedIOU = origTx?.linkedIOUId
                  ? ious.find((iou) => iou.id === origTx.linkedIOUId)
                  : null;
                const amountChanged =
                  editTx && Number(editTx.amount) !== origTx?.amount;
                if (!linkedIOU || !amountChanged || !origTx) return null;
                const originalTotal =
                  linkedIOU.amountLent + Number(origTx.amount);
                return (
                  <div
                    className="rounded-xl p-3 space-y-2"
                    style={{ backgroundColor: "oklch(var(--secondary))" }}
                  >
                    <p className="text-sm font-medium text-foreground">
                      Did the total bill amount change?
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Original total: ₱{originalTotal.toLocaleString()} (your
                      share ₱{origTx.amount.toLocaleString()} + their share ₱
                      {linkedIOU.amountLent.toLocaleString()})
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex-1 text-xs py-2 rounded-xl font-medium"
                        style={{
                          backgroundColor:
                            splitTotalBillChanged === true
                              ? "oklch(var(--primary))"
                              : "oklch(var(--secondary) / 0.8)",
                          color:
                            splitTotalBillChanged === true
                              ? "oklch(var(--primary-foreground))"
                              : "oklch(var(--foreground))",
                          border: "1px solid oklch(var(--border))",
                        }}
                        onClick={() => setSplitTotalBillChanged(true)}
                        data-ocid="history.edit.split_total_changed.button"
                      >
                        Yes, total changed
                      </button>
                      <button
                        type="button"
                        className="flex-1 text-xs py-2 rounded-xl font-medium"
                        style={{
                          backgroundColor:
                            splitTotalBillChanged === false
                              ? "oklch(var(--primary))"
                              : "oklch(var(--secondary) / 0.8)",
                          color:
                            splitTotalBillChanged === false
                              ? "oklch(var(--primary-foreground))"
                              : "oklch(var(--foreground))",
                          border: "1px solid oklch(var(--border))",
                        }}
                        onClick={() => setSplitTotalBillChanged(false)}
                        data-ocid="history.edit.split_same_total.button"
                      >
                        No, same total
                      </button>
                    </div>
                    {splitTotalBillChanged === true && (
                      <div>
                        <Label>New Total Bill Amount</Label>
                        <input
                          type="number"
                          className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-background"
                          style={{ borderColor: "oklch(var(--border))" }}
                          placeholder="Enter new total"
                          value={splitNewTotal}
                          onChange={(e) => setSplitNewTotal(e.target.value)}
                          data-ocid="history.edit.split_new_total.input"
                        />
                        {splitNewTotal && Number(splitNewTotal) > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Their share will be: ₱
                            {(
                              Number(splitNewTotal) - Number(editTx.amount)
                            ).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                    {splitTotalBillChanged === false && (
                      <p className="text-xs text-muted-foreground">
                        Their share will adjust to: ₱
                        {(
                          originalTotal - Number(editTx.amount)
                        ).toLocaleString()}{" "}
                        (total ₱{originalTotal.toLocaleString()} stays the same)
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSplitTotalBillChanged(null);
                setSplitNewTotal("");
                setEditTx(null);
              }}
              data-ocid="history.edit.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              style={{
                backgroundColor: "oklch(var(--primary))",
                color: "oklch(var(--primary-foreground))",
              }}
              data-ocid="history.edit.save_button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent data-ocid="history.delete.dialog">
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("confirmDelete")}</p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              data-ocid="history.delete.cancel_button"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleDelete}
              style={{ backgroundColor: "#EB5757", color: "#fff" }}
              data-ocid="history.delete.confirm_button"
            >
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
