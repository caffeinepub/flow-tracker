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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from "date-fns";
import { Copy, Download, Pencil, Trash2 } from "lucide-react";
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
  onOpenAddTransaction?: (prefill: {
    amount?: string;
    date?: string;
    description?: string;
    type?: "expense" | "income" | "saveToGoal";
    subCategory?: string;
    account?: string;
  }) => void;
}

type PeriodFilter = "all" | "current" | string;

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

interface CopyState {
  tx: Transaction;
  dateChoice: "today" | "original";
}

export function History({
  onNavigate: _onNavigate,
  privacyMode = false,
  onOpenAddTransaction,
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

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("current");
  const [filterMain, setFilterMain] = useState<string>("All");
  const [filterSub, setFilterSub] = useState<string>("All");
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editTx, setEditTx] = useState<EditState | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copyTx, setCopyTx] = useState<CopyState | null>(null);
  const [splitTotalBillChanged, setSplitTotalBillChanged] = useState<
    boolean | null
  >(null);
  const [splitNewTotal, setSplitNewTotal] = useState("");

  const filteredByPeriod = (() => {
    if (periodFilter === "current") return currentTransactions;
    if (periodFilter === "all") {
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
    const period = periods.find((p) => p.id === periodFilter);
    return period
      ? [...period.transactions].sort((a, b) => b.date.localeCompare(a.date))
      : [];
  })();

  const filtered = filteredByPeriod.filter((tx) => {
    if (filterMain === "__income__") {
      if (tx.type !== "income" || tx.mainCategory === "Transfer") return false;
    } else if (filterMain === "Transfer") {
      if (tx.mainCategory !== "Transfer") return false;
    } else if (filterMain !== "All") {
      if (tx.mainCategory !== filterMain) return false;
    }
    if (filterSub !== "All" && tx.subCategory !== filterSub) return false;
    if (filterAccount !== "all" && tx.account !== filterAccount) return false;
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

    const origTx = transactions.find((tx) => tx.id === editTx.id);
    if (origTx?.account) {
      const origAcc = accounts.find((a) => a.name === origTx.account);
      if (origAcc) {
        if (origTx.type === "expense") {
          creditAccount(origAcc.id, Number(origTx.amount));
        } else if (origTx.type === "income") {
          debitAccount(origAcc.id, Number(origTx.amount));
        }
      }
    }

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

    const origTxForIOU = transactions.find((tx) => tx.id === editTx.id);
    if (origTxForIOU?.linkedIOUId) {
      const linkedIOU = ious.find((iou) => iou.id === origTxForIOU.linkedIOUId);
      if (linkedIOU) {
        const amountChanged = num !== Number(origTxForIOU.amount);
        if (amountChanged) {
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
    deleteTransaction(deleteId);
    setDeleteId(null);
    toast.success("Transaction deleted");
  };

  const periodLabel = (id: string) => {
    const p = periods.find((x) => x.id === id);
    if (!p) return id;
    try {
      return `${format(parseISO(p.startDate), "MMM d")} \u2013 ${format(parseISO(p.endDate), "MMM d")}`;
    } catch {
      return id;
    }
  };

  const accountOptions = [
    { id: "", name: "None" },
    ...accounts.flatMap((a) => [
      { id: a.name, name: a.name },
      ...(a.subAccounts ?? []).map((sub) => ({
        id: `${a.id}>${sub.id}`,
        name: `${a.name} › ${sub.name}`,
      })),
    ]),
  ];

  // Pill chip helper classes
  const activePill =
    "flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all bg-primary/15 text-primary border border-primary/40";
  const inactivePill =
    "flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all glass-card-sm text-muted-foreground border-0 hover:text-foreground";

  return (
    <div className="pb-24 animate-spring-in">
      <Tabs defaultValue="transactions" className="w-full">
        {/* Tab header */}
        <div className="px-4 pt-2">
          <div className="flex items-center gap-2 mb-4">
            <TabsList className="flex-1 glass-card-sm border-0">
              <TabsTrigger
                value="transactions"
                className="flex-1 font-display text-xs font-semibold"
                data-ocid="history.transactions.tab"
              >
                Transactions
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="flex-1 font-display text-xs font-semibold"
                data-ocid="history.reports.tab"
              >
                Reports
              </TabsTrigger>
            </TabsList>
            <HelpSheet section="history" language={config?.language ?? "en"} />
          </div>
        </div>

        <TabsContent value="transactions" className="mt-0">
          <div className="px-4 space-y-2.5">
            {/* Period filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setPeriodFilter("all")}
                className={periodFilter === "all" ? activePill : inactivePill}
                data-ocid="history.period_all.toggle"
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter("current")}
                className={
                  periodFilter === "current" ? activePill : inactivePill
                }
                data-ocid="history.period_current.toggle"
              >
                Current
              </button>
              {periods.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPeriodFilter(p.id)}
                  className={`${periodFilter === p.id ? activePill : inactivePill} whitespace-nowrap`}
                  data-ocid="history.period.toggle"
                >
                  {periodLabel(p.id)}
                </button>
              ))}
            </div>

            {/* Search bar + CSV export */}
            <div className="flex items-center gap-2">
              <div className="floating-label-group flex-1">
                <input
                  type="text"
                  placeholder=" "
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-3"
                  id="history-search"
                  data-ocid="history.search.input"
                />
                <label htmlFor="history-search">{t("searchPlaceholder")}</label>
              </div>
              <button
                type="button"
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-2 glass-card-sm border text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all flex-shrink-0"
                data-ocid="history.export.button"
              >
                <Download size={13} />
                CSV
              </button>
            </div>

            {/* Category filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setFilterMain("All");
                  setFilterSub("All");
                }}
                className={filterMain === "All" ? activePill : inactivePill}
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
                  className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all border"
                  style={{
                    backgroundColor:
                      filterMain === cat.name ? `${cat.color}22` : undefined,
                    borderColor:
                      filterMain === cat.name
                        ? `${cat.color}66`
                        : "transparent",
                    color: filterMain === cat.name ? cat.color : undefined,
                    backdropFilter: "blur(8px)",
                    background:
                      filterMain === cat.name
                        ? `${cat.color}22`
                        : "var(--glass-bg)",
                  }}
                  data-ocid="history.filter_category.toggle"
                >
                  {cat.name}
                </button>
              ))}
              {/* Income chip */}
              <button
                type="button"
                onClick={() => {
                  setFilterMain("__income__");
                  setFilterSub("All");
                }}
                className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all border"
                style={{
                  backgroundColor:
                    filterMain === "__income__"
                      ? "oklch(0.6 0.22 195 / 0.15)"
                      : "var(--glass-bg)",
                  borderColor:
                    filterMain === "__income__"
                      ? "oklch(0.6 0.22 195 / 0.5)"
                      : "transparent",
                  color:
                    filterMain === "__income__"
                      ? "oklch(var(--accent))"
                      : undefined,
                  backdropFilter: "blur(8px)",
                }}
                data-ocid="history.filter_income.toggle"
              >
                Income
              </button>
              {/* Transfer chip */}
              <button
                type="button"
                onClick={() => {
                  setFilterMain("Transfer");
                  setFilterSub("All");
                }}
                className={
                  filterMain === "Transfer" ? activePill : inactivePill
                }
                data-ocid="history.filter_transfer.toggle"
              >
                Transfer
              </button>
            </div>

            {/* Subcategory chips */}
            {subCatsForFilter.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setFilterSub("All")}
                  className={filterSub === "All" ? activePill : inactivePill}
                >
                  All
                </button>
                {subCatsForFilter.map((sub) => (
                  <button
                    type="button"
                    key={sub.id}
                    onClick={() => setFilterSub(sub.name)}
                    className={
                      filterSub === sub.name ? activePill : inactivePill
                    }
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}

            {/* Account filter chips */}
            {accounts.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setFilterAccount("all")}
                  className={
                    filterAccount === "all" ? activePill : inactivePill
                  }
                  data-ocid="history.filter_account_all.toggle"
                >
                  All Accounts
                </button>
                {accounts.flatMap((acc) => {
                  const chips = [
                    <button
                      type="button"
                      key={acc.id}
                      onClick={() => setFilterAccount(acc.name)}
                      className={`${filterAccount === acc.name ? activePill : inactivePill} whitespace-nowrap`}
                      data-ocid="history.filter_account.toggle"
                    >
                      {acc.name}
                    </button>,
                    ...(acc.subAccounts ?? []).map((sub) => {
                      const subKey = `${acc.id}>${sub.id}`;
                      return (
                        <button
                          type="button"
                          key={subKey}
                          onClick={() => setFilterAccount(subKey)}
                          className={`${filterAccount === subKey ? activePill : inactivePill} whitespace-nowrap`}
                          data-ocid="history.filter_subaccount.toggle"
                        >
                          {acc.name} › {sub.name}
                        </button>
                      );
                    }),
                  ];
                  return chips;
                })}
              </div>
            )}

            {/* Summary line */}
            <p className="text-xs text-muted-foreground">
              {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
              {periodFilter === "all"
                ? " (all time)"
                : periodFilter === "current"
                  ? " (current period)"
                  : ` (${periodLabel(periodFilter)})`}
            </p>
          </div>

          {/* Transaction list */}
          <div className="px-4 mt-2 space-y-2">
            {filtered.length === 0 ? (
              <div
                className="glass-card p-10 text-center animate-spring-in mt-4"
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
                const isIncome = tx.type === "income";
                return (
                  <div
                    key={tx.id}
                    className="glass-card-sm card-hover flex items-center gap-3 p-3 animate-spring-up"
                    style={{ animationDelay: `${Math.min(idx * 40, 400)}ms` }}
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
                          <p className="text-sm font-semibold text-foreground truncate">
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
                        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                          <span
                            className="text-sm font-bold font-display"
                            style={{
                              color: isIncome
                                ? "oklch(var(--accent))"
                                : "oklch(var(--destructive))",
                            }}
                          >
                            {isIncome ? "+" : "-"}
                            {pAmt(tx.amount)}
                          </span>
                          {/* Type badge */}
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{
                              backgroundColor: isIncome
                                ? "oklch(var(--accent) / 0.15)"
                                : "oklch(var(--destructive) / 0.15)",
                              color: isIncome
                                ? "oklch(var(--accent))"
                                : "oklch(var(--destructive))",
                            }}
                          >
                            {isIncome ? "In" : "Out"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setCopyTx({ tx, dateChoice: "today" })}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                        aria-label="Copy transaction"
                        data-ocid={`history.transaction.copy_button.${idx + 1}`}
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(tx)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                        aria-label="Edit transaction"
                        data-ocid={`history.transaction.edit_button.${idx + 1}`}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(tx.id)}
                        className="p-1.5 rounded-lg text-destructive hover:bg-destructive/15 transition-all"
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

      {/* Edit Dialog */}
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
          className="glass-card max-h-[90vh] overflow-y-auto border-0"
          data-ocid="history.edit.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">Edit Transaction</DialogTitle>
          </DialogHeader>
          {editTx && (
            <div className="space-y-4">
              {/* Type toggle */}
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Type
                </Label>
                <div className="flex gap-2 mt-2">
                  {(["expense", "income"] as TransactionType[]).map((tp) => (
                    <button
                      type="button"
                      key={tp}
                      onClick={() =>
                        setEditTx((prev) =>
                          prev ? { ...prev, type: tp } : prev,
                        )
                      }
                      className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        backgroundColor:
                          editTx.type === tp
                            ? tp === "expense"
                              ? "oklch(var(--destructive) / 0.15)"
                              : "oklch(var(--primary) / 0.15)"
                            : "var(--glass-bg)",
                        color:
                          editTx.type === tp
                            ? tp === "expense"
                              ? "oklch(var(--destructive))"
                              : "oklch(var(--primary))"
                            : "oklch(var(--muted-foreground))",
                        border: `1.5px solid ${
                          editTx.type === tp
                            ? tp === "expense"
                              ? "oklch(var(--destructive) / 0.4)"
                              : "oklch(var(--primary) / 0.4)"
                            : "var(--glass-border)"
                        }`,
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
                <Label
                  htmlFor="edit-amount"
                  className="text-xs uppercase tracking-wide text-muted-foreground font-semibold"
                >
                  Amount
                </Label>
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
                <Label
                  htmlFor="edit-date"
                  className="text-xs uppercase tracking-wide text-muted-foreground font-semibold"
                >
                  Date
                </Label>
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
                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Category
                </Label>
                <div className="mt-2 grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
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
                            className="w-full flex items-center gap-1.5 p-1.5 rounded-lg mb-0.5 text-left transition-all glass-card-sm"
                            style={{
                              backgroundColor:
                                editTx.subCategory === sub.name
                                  ? `${effectiveColor}22`
                                  : undefined,
                              borderColor:
                                editTx.subCategory === sub.name
                                  ? `${effectiveColor}66`
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
                <Label
                  htmlFor="edit-desc"
                  className="text-xs uppercase tracking-wide text-muted-foreground font-semibold"
                >
                  Description
                </Label>
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

              {/* Account */}
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  Account{" "}
                  <span className="text-muted-foreground text-xs font-normal normal-case tracking-normal">
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
                      className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                      style={{
                        backgroundColor:
                          editTx.account === acc.id
                            ? "oklch(var(--primary) / 0.15)"
                            : "var(--glass-bg)",
                        border: `1px solid ${
                          editTx.account === acc.id
                            ? "oklch(var(--primary) / 0.4)"
                            : "var(--glass-border)"
                        }`,
                        color:
                          editTx.account === acc.id
                            ? "oklch(var(--primary))"
                            : "oklch(var(--foreground))",
                        backdropFilter: "blur(8px)",
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
                  <div className="glass-card-sm p-3 space-y-2">
                    <p className="text-sm font-semibold text-foreground font-display">
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
                        className="flex-1 text-xs py-2 rounded-xl font-semibold transition-all"
                        style={{
                          backgroundColor:
                            splitTotalBillChanged === true
                              ? "oklch(var(--primary) / 0.15)"
                              : "var(--glass-bg)",
                          color:
                            splitTotalBillChanged === true
                              ? "oklch(var(--primary))"
                              : "oklch(var(--foreground))",
                          border: `1px solid ${splitTotalBillChanged === true ? "oklch(var(--primary) / 0.4)" : "var(--glass-border)"}`,
                        }}
                        onClick={() => setSplitTotalBillChanged(true)}
                        data-ocid="history.edit.split_total_changed.button"
                      >
                        Yes, total changed
                      </button>
                      <button
                        type="button"
                        className="flex-1 text-xs py-2 rounded-xl font-semibold transition-all"
                        style={{
                          backgroundColor:
                            splitTotalBillChanged === false
                              ? "oklch(var(--primary) / 0.15)"
                              : "var(--glass-bg)",
                          color:
                            splitTotalBillChanged === false
                              ? "oklch(var(--primary))"
                              : "oklch(var(--foreground))",
                          border: `1px solid ${splitTotalBillChanged === false ? "oklch(var(--primary) / 0.4)" : "var(--glass-border)"}`,
                        }}
                        onClick={() => setSplitTotalBillChanged(false)}
                        data-ocid="history.edit.split_same_total.button"
                      >
                        No, same total
                      </button>
                    </div>
                    {splitTotalBillChanged === true && (
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                          New Total Bill Amount
                        </Label>
                        <input
                          type="number"
                          className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-input border-border focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-ocid="history.edit.save_button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent
          className="glass-card border-0"
          data-ocid="history.delete.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              Delete Transaction
            </DialogTitle>
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="history.delete.confirm_button"
            >
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Transaction Sheet */}
      <Sheet open={!!copyTx} onOpenChange={(o) => !o && setCopyTx(null)}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl glass-card border-0"
          data-ocid="history.copy.sheet"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="font-display">Copy Transaction</SheetTitle>
          </SheetHeader>
          {copyTx && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                <span className="font-semibold text-foreground">
                  {copyTx.tx.description || copyTx.tx.subCategory}
                </span>
                {" · "}₱
                {copyTx.tx.amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-sm font-semibold text-foreground mb-3 font-display">
                Which date would you like to use?
              </p>
              <div className="flex gap-2 mb-6">
                <button
                  type="button"
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    backgroundColor:
                      copyTx.dateChoice === "today"
                        ? "oklch(var(--primary) / 0.15)"
                        : "var(--glass-bg)",
                    color:
                      copyTx.dateChoice === "today"
                        ? "oklch(var(--primary))"
                        : "oklch(var(--foreground))",
                    border: `1.5px solid ${copyTx.dateChoice === "today" ? "oklch(var(--primary) / 0.4)" : "var(--glass-border)"}`,
                  }}
                  onClick={() =>
                    setCopyTx((p) => (p ? { ...p, dateChoice: "today" } : null))
                  }
                  data-ocid="history.copy.today.button"
                >
                  Today
                </button>
                <button
                  type="button"
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    backgroundColor:
                      copyTx.dateChoice === "original"
                        ? "oklch(var(--primary) / 0.15)"
                        : "var(--glass-bg)",
                    color:
                      copyTx.dateChoice === "original"
                        ? "oklch(var(--primary))"
                        : "oklch(var(--foreground))",
                    border: `1.5px solid ${copyTx.dateChoice === "original" ? "oklch(var(--primary) / 0.4)" : "var(--glass-border)"}`,
                  }}
                  onClick={() =>
                    setCopyTx((p) =>
                      p ? { ...p, dateChoice: "original" } : null,
                    )
                  }
                  data-ocid="history.copy.original_date.button"
                >
                  Original: {format(parseISO(copyTx.tx.date), "MMM d, yyyy")}
                </button>
              </div>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  if (!copyTx) return;
                  const chosenDate =
                    copyTx.dateChoice === "today"
                      ? format(new Date(), "yyyy-MM-dd")
                      : copyTx.tx.date;
                  const tx = copyTx.tx;
                  setCopyTx(null);
                  if (onOpenAddTransaction) {
                    onOpenAddTransaction({
                      amount: tx.amount.toString(),
                      date: chosenDate,
                      description: tx.description,
                      type: tx.type as "expense" | "income",
                      subCategory: tx.subCategory,
                      account: tx.account,
                    });
                  }
                }}
                data-ocid="history.copy.confirm.button"
              >
                Continue to Add Transaction
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
