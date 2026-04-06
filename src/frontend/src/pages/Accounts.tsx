import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { differenceInDays, format, parseISO } from "date-fns";
import {
  AlertTriangle,
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock,
  CreditCard,
  GripVertical,
  HandCoins,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  Receipt,
  Smartphone,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { HelpSheet } from "../components/HelpSheet";
import { formatAmount } from "../data/categories";
import { useFinanceData } from "../hooks/useFinanceData";
import type { Account, AccountType, Bill, IOU, SubAccount } from "../types";

const ACCOUNT_PRESETS: { name: string; type: AccountType; color: string }[] = [
  { name: "Cash", type: "cash", color: "#F2C94C" },
  { name: "GCash", type: "ewallet", color: "#007AFF" },
  { name: "Maya", type: "ewallet", color: "#00C48C" },
  { name: "ShopeePay", type: "ewallet", color: "#EE4D2D" },
  { name: "BPI", type: "bank", color: "#C0392B" },
  { name: "BDO", type: "bank", color: "#1B5E20" },
  { name: "Metrobank", type: "bank", color: "#7B6000" },
  { name: "UnionBank", type: "bank", color: "#1565C0" },
  { name: "Security Bank", type: "bank", color: "#B71C1C" },
  { name: "Custom", type: "bank", color: "#888888" },
];

const TYPE_ICONS: Record<AccountType, React.ElementType> = {
  cash: Wallet,
  ewallet: Smartphone,
  bank: Building2,
  credit: CreditCard,
};

const TYPE_LABELS: Record<AccountType, string> = {
  cash: "Cash",
  ewallet: "E-Wallet",
  bank: "Bank",
  credit: "Credit Card",
};

function getUtilColor(pct: number): string {
  if (pct < 50) return "#20D18A";
  if (pct < 70) return "#F2C94C";
  if (pct < 90) return "#F97316";
  return "#EB5757";
}

interface AddAccountForm {
  preset: string;
  customName: string;
  type: AccountType;
  balance: string;
  creditLimit: string;
  apr: string;
  dueDate: string;
  color: string;
}

function emptyForm(): AddAccountForm {
  return {
    preset: "",
    customName: "",
    type: "bank",
    balance: "",
    creditLimit: "",
    apr: "",
    dueDate: "",
    color: "#888888",
  };
}

interface TransferForm {
  fromId: string;
  toId: string;
  amount: string;
  note: string;
}

interface AddIOUForm {
  personName: string;
  amountLent: string;
  sourceAccountId: string;
  dateLent: string;
  dueDate: string;
  interestPct: string;
}

interface RepayForm {
  amount: string;
  accountId: string;
  date: string;
  note: string;
}

function getIOUBalance(iou: IOU): number {
  const repaid = iou.events
    .filter((e) => e.type === "repay")
    .reduce((sum, e) => sum + e.amount, 0);
  return Math.max(0, iou.amountLent - repaid);
}

function IOUStatusBadge({ status }: { status: IOU["status"] }) {
  const map = {
    current: { label: "Current", bg: "#20D18A22", color: "#20D18A" },
    overdue: { label: "Overdue", bg: "#EB575722", color: "#EB5757" },
    paid: {
      label: "Paid",
      bg: "oklch(var(--muted))",
      color: "oklch(var(--muted-foreground))",
    },
    forgiven: {
      label: "Forgiven",
      bg: "oklch(var(--muted))",
      color: "oklch(var(--muted-foreground))",
    },
  };
  const s = map[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function Accounts() {
  const {
    config,
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    reorderAccounts,
    transferBetweenAccounts,
    getCCAlerts,
    transactions,
    periods,
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
    bills,
    addBill,
    updateBill,
    deleteBill,
    toggleBillPaid,
    addSubAccount,
    editSubAccount,
    deleteSubAccount,
  } = useFinanceData();
  const currency = config?.currency ?? "PHP";

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddAccountForm>(emptyForm());
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState<TransferForm>({
    fromId: "",
    toId: "",
    amount: "",
    note: "",
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editAccount, setEditAccount] = useState<Account | null>(null);

  // Sub-account state
  const [expandedSubAccounts, setExpandedSubAccounts] = useState<
    Record<string, boolean>
  >({});
  const [showAddSubAccount, setShowAddSubAccount] = useState<string | null>(
    null,
  ); // parentId
  const [editSubAccountState, setEditSubAccountState] = useState<{
    parentId: string;
    sub: SubAccount;
  } | null>(null);
  const [subAccountForm, setSubAccountForm] = useState({
    name: "",
    balance: "",
    openingDate: format(new Date(), "yyyy-MM-dd"),
    color: "#888888",
  });
  const [subAccountHistory, setSubAccountHistory] = useState<{
    parentId: string;
    subId: string;
    name: string;
  } | null>(null);

  // Drag-to-reorder state
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  // Collapsible sections — persisted in localStorage
  const ACCOUNTS_COLLAPSE_KEY = "flow_accounts_sections";
  const [accountsCollapsed, setAccountsCollapsed] = useState<
    Record<string, boolean>
  >(() => {
    try {
      const stored = localStorage.getItem(ACCOUNTS_COLLAPSE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const toggleAccountsSection = (key: string) => {
    setAccountsCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(ACCOUNTS_COLLAPSE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const isAccCollapsed = (key: string) => !!accountsCollapsed[key];

  // Bill Tracker state
  const [showAddBill, setShowAddBill] = useState(false);
  const [editBill, setEditBill] = useState<Bill | null>(null);
  const [billForm, setBillForm] = useState({
    name: "",
    amount: "",
    dueDayOfMonth: "",
    notes: "",
  });

  const resetBillForm = () =>
    setBillForm({ name: "", amount: "", dueDayOfMonth: "", notes: "" });

  const handleSaveBill = () => {
    const name = billForm.name.trim();
    const amount = Number.parseFloat(billForm.amount);
    const dueDayOfMonth = Number.parseInt(billForm.dueDayOfMonth, 10);
    if (!name) {
      toast.error("Bill name is required");
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Valid amount required");
      return;
    }
    if (
      Number.isNaN(dueDayOfMonth) ||
      dueDayOfMonth < 1 ||
      dueDayOfMonth > 31
    ) {
      toast.error("Due day must be between 1 and 31");
      return;
    }
    if (editBill) {
      updateBill(editBill.id, {
        name,
        amount,
        dueDayOfMonth,
        notes: billForm.notes.trim() || undefined,
      });
      toast.success("Bill updated");
      setEditBill(null);
    } else {
      addBill({
        name,
        amount,
        dueDayOfMonth,
        notes: billForm.notes.trim() || undefined,
      });
      toast.success("Bill added");
      setShowAddBill(false);
    }
    resetBillForm();
  };

  // Bills due soon (within 3 days of today by day of month)
  const todayDay = new Date().getDate();
  const billsDueSoon = bills.filter((b) => {
    const diff = b.dueDayOfMonth - todayDay;
    return diff >= 0 && diff <= 3;
  });

  // IOU state
  // "lent" or "borrowed" tab
  const [iouTab, setIouTab] = useState<"lent" | "borrowed">("lent");
  const [showAddIOU, setShowAddIOU] = useState(false);
  const [showAddBorrowedIOU, setShowAddBorrowedIOU] = useState(false);
  const [iouForm, setIouForm] = useState<AddIOUForm>({
    personName: "",
    amountLent: "",
    sourceAccountId: "",
    dateLent: format(new Date(), "yyyy-MM-dd"),
    dueDate: "",
    interestPct: "",
  });
  const [borrowedForm, setBorrowedForm] = useState<
    AddIOUForm & { destAccountId: string }
  >({
    personName: "",
    amountLent: "",
    sourceAccountId: "",
    destAccountId: "",
    dateLent: format(new Date(), "yyyy-MM-dd"),
    dueDate: "",
    interestPct: "",
  });
  const [repayingIOU, setRepayingIOU] = useState<IOU | null>(null);
  const [repayBorrowedIOU_state, setRepayBorrowedIOU] = useState<IOU | null>(
    null,
  );
  const [repayForm, setRepayForm] = useState<RepayForm>({
    amount: "",
    accountId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    note: "",
  });
  const [repayBorrowedForm, setRepayBorrowedForm] = useState<RepayForm>({
    amount: "",
    accountId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    note: "",
  });
  const [deleteIOUId, setDeleteIOUId] = useState<string | null>(null);
  const [expandedIOUHistory, setExpandedIOUHistory] = useState<Set<string>>(
    new Set(),
  );

  const ccAlerts = getCCAlerts();

  // Per-account history
  const [historyAccount, setHistoryAccount] = useState<
    (typeof accounts)[0] | null
  >(null);

  // All transactions across current + archived periods, deduplicated by id
  const allAccountTransactions = (() => {
    const seen = new Set<string>();
    const all: typeof transactions = [];
    for (const tx of transactions) {
      if (!seen.has(tx.id)) {
        seen.add(tx.id);
        all.push(tx);
      }
    }
    for (const p of periods) {
      for (const tx of p.transactions) {
        if (!seen.has(tx.id)) {
          seen.add(tx.id);
          all.push(tx);
        }
      }
    }
    return all.sort((a, b) => b.date.localeCompare(a.date));
  })();

  // Net worth calculation
  const totalAssets = accounts
    .filter((a) => a.type !== "credit" && a.balance > 0)
    .reduce((s, a) => s + a.balance, 0);
  const totalLiabilities =
    accounts
      .filter((a) => a.type === "credit")
      .reduce((s, a) => s + Math.abs(a.balance), 0) + totalIOUsBorrowed;
  const netWorth = totalAssets + totalIOUsOwed - totalLiabilities;

  // Transfer history
  const transferHistory = transactions
    .filter((t) => t.mainCategory === "Transfer")
    .slice(0, 10);

  const handlePresetSelect = (presetName: string) => {
    const preset = ACCOUNT_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      preset: presetName,
      customName: presetName === "Custom" ? "" : presetName,
      type: preset.type,
      color: preset.color,
    }));
  };

  const handleAddAccount = () => {
    const name =
      form.preset === "Custom"
        ? form.customName
        : form.customName || form.preset;
    if (!name) {
      toast.error("Account name is required");
      return;
    }
    const balance = Number.parseFloat(form.balance) || 0;
    const creditLimit =
      form.type === "credit"
        ? Number.parseFloat(form.creditLimit) || 0
        : undefined;
    const apr =
      form.type === "credit" ? Number.parseFloat(form.apr) || 0 : undefined;
    const dueDate =
      form.type === "credit" && form.dueDate ? form.dueDate : undefined;

    addAccount({
      name,
      type: form.type,
      balance,
      creditLimit,
      apr,
      dueDate,
      color: form.color,
    });
    setShowAdd(false);
    setForm(emptyForm());
    toast.success(`${name} account added!`);
  };

  const handleTransfer = () => {
    const amount = Number.parseFloat(transferForm.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!transferForm.fromId || !transferForm.toId) {
      toast.error("Select both accounts");
      return;
    }
    if (transferForm.fromId === transferForm.toId) {
      toast.error("Cannot transfer to the same account");
      return;
    }

    const fromIsSubAccount = transferForm.fromId.includes(">");
    const toIsSubAccount = transferForm.toId.includes(">");
    const fromParentId = fromIsSubAccount
      ? transferForm.fromId.split(">")[0]
      : transferForm.fromId;
    const toParentId = toIsSubAccount
      ? transferForm.toId.split(">")[0]
      : transferForm.toId;
    const fromSubId = fromIsSubAccount
      ? transferForm.fromId.split(">")[1]
      : null;
    const toSubId = toIsSubAccount ? transferForm.toId.split(">")[1] : null;

    // Handle sub-account balance updates using editSubAccount
    if (fromIsSubAccount && fromSubId) {
      const fromParentAcc = accounts.find((a) => a.id === fromParentId);
      const fromSub = fromParentAcc?.subAccounts?.find(
        (s) => s.id === fromSubId,
      );
      if (fromSub) {
        editSubAccount(fromParentId, fromSubId, {
          balance: fromSub.balance - amount,
        });
      }
    }
    if (toIsSubAccount && toSubId) {
      const toParentAcc = accounts.find((a) => a.id === toParentId);
      const toSub = toParentAcc?.subAccounts?.find((s) => s.id === toSubId);
      if (toSub) {
        editSubAccount(toParentId, toSubId, {
          balance: toSub.balance + amount,
        });
      }
    }

    transferBetweenAccounts(
      fromParentId,
      toParentId,
      amount,
      transferForm.note,
    );
    setShowTransfer(false);
    setTransferForm({ fromId: "", toId: "", amount: "", note: "" });
    toast.success("Transfer recorded!");
  };

  const handleSaveEdit = () => {
    if (!editAccount) return;
    updateAccount(editAccount.id, editAccount);
    setEditAccount(null);
    toast.success("Account updated!");
  };

  // Drag-to-reorder handlers
  const handleDragStart = (idx: number) => {
    dragIndex.current = idx;
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    dragOverIndex.current = idx;
  };

  const handleDrop = () => {
    const from = dragIndex.current;
    const to = dragOverIndex.current;
    if (from === null || to === null || from === to) return;
    const reordered = [...accounts];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    reorderAccounts(reordered);
    dragIndex.current = null;
    dragOverIndex.current = null;
  };

  // IOU handlers — lent
  const handleAddIOU = () => {
    if (!iouForm.personName.trim()) {
      toast.error("Person name is required");
      return;
    }
    const amount = Number.parseFloat(iouForm.amountLent);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!iouForm.dueDate) {
      toast.error("Due date is required");
      return;
    }
    addIOU(
      {
        personName: iouForm.personName.trim(),
        amountLent: amount,
        dateLent: iouForm.dateLent,
        dueDate: iouForm.dueDate,
        interestPct: iouForm.interestPct
          ? Number.parseFloat(iouForm.interestPct)
          : undefined,
      },
      iouForm.sourceAccountId || undefined,
    );
    setShowAddIOU(false);
    setIouForm({
      personName: "",
      amountLent: "",
      sourceAccountId: "",
      dateLent: format(new Date(), "yyyy-MM-dd"),
      dueDate: "",
      interestPct: "",
    });
    toast.success("IOU added!");
  };

  // IOU handlers — borrowed
  const handleAddBorrowedIOU = () => {
    if (!borrowedForm.personName.trim()) {
      toast.error("Person name is required");
      return;
    }
    const amount = Number.parseFloat(borrowedForm.amountLent);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!borrowedForm.dueDate) {
      toast.error("Due date is required");
      return;
    }
    addBorrowedIOU(
      {
        personName: borrowedForm.personName.trim(),
        amountLent: amount,
        dateLent: borrowedForm.dateLent,
        dueDate: borrowedForm.dueDate,
        interestPct: borrowedForm.interestPct
          ? Number.parseFloat(borrowedForm.interestPct)
          : undefined,
      },
      borrowedForm.destAccountId || undefined,
    );
    setShowAddBorrowedIOU(false);
    setBorrowedForm({
      personName: "",
      amountLent: "",
      sourceAccountId: "",
      destAccountId: "",
      dateLent: format(new Date(), "yyyy-MM-dd"),
      dueDate: "",
      interestPct: "",
    });
    toast.success("Borrowed IOU added!");
  };

  const handleRepayIOU = () => {
    if (!repayingIOU) return;
    const amount = Number.parseFloat(repayForm.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!repayForm.accountId) {
      toast.error("Select which account received the repayment");
      return;
    }
    repayIOU(
      repayingIOU.id,
      amount,
      repayForm.accountId,
      repayForm.date,
      repayForm.note || undefined,
    );
    setRepayingIOU(null);
    setRepayForm({
      amount: "",
      accountId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      note: "",
    });
    toast.success("Repayment logged!");
  };

  const handleRepayBorrowedIOU = () => {
    if (!repayBorrowedIOU_state) return;
    const amount = Number.parseFloat(repayBorrowedForm.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!repayBorrowedForm.accountId) {
      toast.error("Select which account you paid from");
      return;
    }
    repayBorrowedIOU(
      repayBorrowedIOU_state.id,
      amount,
      repayBorrowedForm.accountId,
      repayBorrowedForm.date,
      repayBorrowedForm.note || undefined,
    );
    setRepayBorrowedIOU(null);
    setRepayBorrowedForm({
      amount: "",
      accountId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      note: "",
    });
    toast.success("Repayment logged!");
  };

  const toggleIOUHistory = (iouId: string) => {
    setExpandedIOUHistory((prev) => {
      const next = new Set(prev);
      if (next.has(iouId)) next.delete(iouId);
      else next.add(iouId);
      return next;
    });
  };

  // Split IOUs by direction
  const lentIOUs = ious
    .filter((iou) => iou.direction === "lent" || !iou.direction)
    .sort((a, b) => {
      const aActive = a.status === "current" || a.status === "overdue" ? 0 : 1;
      const bActive = b.status === "current" || b.status === "overdue" ? 0 : 1;
      return aActive - bActive;
    });

  const borrowedIOUs = ious
    .filter((iou) => iou.direction === "borrowed")
    .sort((a, b) => {
      const aActive = a.status === "current" || a.status === "overdue" ? 0 : 1;
      const bActive = b.status === "current" || b.status === "overdue" ? 0 : 1;
      return aActive - bActive;
    });

  const EVENT_TYPE_LABELS: Record<string, string> = {
    lend: "Lent",
    borrow: "Borrowed",
    repay: "Repaid",
    forgiven: "Forgiven",
    paid: "Marked Paid",
  };

  return (
    <div className="pb-24 px-4 pt-2 fade-in">
      {/* CC Alerts */}
      {ccAlerts.length > 0 && (
        <div
          className="rounded-2xl border p-3 mb-4"
          style={{
            backgroundColor: "oklch(0.65 0.22 25 / 0.1)",
            borderColor: "oklch(0.65 0.22 25)",
          }}
          data-ocid="accounts.alerts.panel"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} style={{ color: "#EB5757" }} />
            <span
              className="text-sm font-semibold"
              style={{ color: "#EB5757" }}
            >
              Credit Card Alerts
            </span>
          </div>
          {ccAlerts.map((alert, i) => (
            <p
              key={`${alert.accountId}-${alert.type}`}
              className="text-xs text-muted-foreground"
              data-ocid={`accounts.alert.item.${i + 1}`}
            >
              • {alert.message}
            </p>
          ))}
        </div>
      )}

      {/* Net Worth */}
      <div
        className="rounded-2xl border border-border p-4 mb-4"
        style={{ backgroundColor: "oklch(var(--card))" }}
        data-ocid="accounts.net_worth.card"
      >
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          Net Worth
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Assets</p>
            <p
              className="text-sm font-bold"
              style={{ color: "oklch(var(--primary))" }}
            >
              {formatAmount(totalAssets + totalIOUsOwed, currency)}
            </p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-xs text-muted-foreground mb-1">Liabilities</p>
            <p
              className="text-sm font-bold"
              style={{
                color:
                  totalLiabilities > 0 ? "#EB5757" : "oklch(var(--foreground))",
              }}
            >
              {formatAmount(totalLiabilities, currency)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Net Worth</p>
            <p
              className="text-sm font-bold"
              style={{
                color: netWorth >= 0 ? "oklch(var(--primary))" : "#EB5757",
              }}
            >
              {formatAmount(netWorth, currency)}
            </p>
          </div>
        </div>
        {/* IOU receivables asset line */}
        {totalIOUsOwed > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <HandCoins size={12} style={{ color: "#20D18A" }} />
              <span className="text-xs text-muted-foreground">
                IOU Receivables
              </span>
            </div>
            <span
              className="text-xs font-semibold"
              style={{ color: "#20D18A" }}
            >
              +{formatAmount(totalIOUsOwed, currency)}
            </span>
          </div>
        )}
        {/* IOU borrowed liability line */}
        {totalIOUsBorrowed > 0 && (
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <HandCoins size={12} style={{ color: "#EB5757" }} />
              <span className="text-xs text-muted-foreground">
                IOUs Borrowed
              </span>
            </div>
            <span
              className="text-xs font-semibold"
              style={{ color: "#EB5757" }}
            >
              -{formatAmount(totalIOUsBorrowed, currency)}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <Button
          className="flex-1 gap-2"
          style={{
            backgroundColor: "oklch(var(--primary))",
            color: "oklch(var(--primary-foreground))",
          }}
          onClick={() => setShowAdd(true)}
          data-ocid="accounts.add.open_modal_button"
        >
          <Plus size={14} /> Add Account
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => setShowTransfer(true)}
          data-ocid="accounts.transfer.open_modal_button"
        >
          <ArrowLeftRight size={14} /> Transfer
        </Button>
      </div>

      {/* Account Cards */}
      <div className="mb-4">
        <button
          type="button"
          className="w-full flex items-center justify-between py-2 mb-2"
          onClick={() => toggleAccountsSection("accountList")}
          data-ocid="accounts.list.toggle"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">
              My Accounts
            </span>
            <HelpSheet section="accounts" language={config?.language ?? "en"} />
          </div>
          {isAccCollapsed("accountList") ? (
            <ChevronDown size={14} className="text-muted-foreground" />
          ) : (
            <ChevronUp size={14} className="text-muted-foreground" />
          )}
        </button>
        {!isAccCollapsed("accountList") && (
          <div className="space-y-3">
            {accounts.map((acc, idx) => {
              const Icon = TYPE_ICONS[acc.type];
              const utilPct =
                acc.type === "credit" && acc.creditLimit
                  ? (acc.balance / acc.creditLimit) * 100
                  : null;
              const utilColor = utilPct !== null ? getUtilColor(utilPct) : null;
              const isDueSoon = (() => {
                if (!acc.dueDate) return false;
                try {
                  const due = parseISO(acc.dueDate);
                  const days = differenceInDays(due, new Date());
                  return days >= 0 && days <= 3;
                } catch {
                  return false;
                }
              })();

              return (
                <div
                  key={acc.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={handleDrop}
                  className="rounded-2xl border border-border p-4 cursor-grab active:cursor-grabbing transition-opacity"
                  style={{ backgroundColor: "oklch(var(--card))" }}
                  data-ocid={`accounts.account.item.${idx + 1}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center justify-center self-stretch pr-1 text-muted-foreground opacity-40">
                      <GripVertical size={16} />
                    </div>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${acc.color ?? "#888"}22` }}
                    >
                      <Icon size={18} style={{ color: acc.color ?? "#888" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {acc.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {TYPE_LABELS[acc.type]}
                        </Badge>
                        {utilPct !== null && utilPct >= 70 && (
                          <Badge
                            className="text-[10px] px-1.5 py-0"
                            style={{
                              backgroundColor: `${utilColor}22`,
                              color: utilColor ?? undefined,
                            }}
                          >
                            {Math.round(utilPct)}% used
                          </Badge>
                        )}
                        {isDueSoon && (
                          <Badge
                            className="text-[10px] px-1.5 py-0"
                            style={{
                              backgroundColor: "#EB575722",
                              color: "#EB5757",
                            }}
                          >
                            Due Soon
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span
                          className="text-lg font-bold"
                          style={{
                            color:
                              acc.type === "credit"
                                ? "#EB5757"
                                : "oklch(var(--primary))",
                          }}
                        >
                          {acc.type === "credit" ? "-" : ""}
                          {formatAmount(Math.abs(acc.balance), currency)}
                        </span>
                        {acc.type === "credit" && acc.creditLimit && (
                          <span className="text-xs text-muted-foreground">
                            Limit: {formatAmount(acc.creditLimit, currency)}
                          </span>
                        )}
                        {acc.type === "credit" && acc.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            Due: {format(parseISO(acc.dueDate), "MMM d")}
                          </span>
                        )}
                      </div>
                      {utilPct !== null && acc.creditLimit && (
                        <div className="mt-2">
                          <div
                            className="h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: "oklch(var(--muted))" }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, utilPct)}%`,
                                backgroundColor: utilColor ?? "#888",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setHistoryAccount(acc)}
                        className="p-1.5 rounded-lg text-muted-foreground"
                        style={{ backgroundColor: "oklch(var(--secondary))" }}
                        title="View account history"
                        data-ocid={`accounts.account.history_button.${idx + 1}`}
                      >
                        <Clock size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditAccount({ ...acc })}
                        className="p-1.5 rounded-lg text-muted-foreground"
                        style={{ backgroundColor: "oklch(var(--secondary))" }}
                        data-ocid={`accounts.account.edit_button.${idx + 1}`}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(acc.id)}
                        className="p-1.5 rounded-lg"
                        style={{
                          backgroundColor: "#EB575722",
                          color: "#EB5757",
                        }}
                        data-ocid={`accounts.account.delete_button.${idx + 1}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Sub-accounts section */}
                  {(acc.subAccounts ?? []).length > 0 && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSubAccounts((prev) => ({
                            ...prev,
                            [acc.id]: !prev[acc.id],
                          }))
                        }
                        className="flex items-center gap-1.5 text-xs text-muted-foreground w-full px-2 py-1 rounded-lg transition-all"
                        style={{
                          backgroundColor: "oklch(var(--secondary) / 0.5)",
                        }}
                      >
                        <Layers size={12} />
                        <span>
                          {(acc.subAccounts ?? []).length} sub-account
                          {(acc.subAccounts ?? []).length !== 1 ? "s" : ""}
                        </span>
                        {expandedSubAccounts[acc.id] ? (
                          <ChevronUp size={12} className="ml-auto" />
                        ) : (
                          <ChevronDown size={12} className="ml-auto" />
                        )}
                      </button>
                      {expandedSubAccounts[acc.id] && (
                        <div className="mt-2 pl-4 space-y-1.5">
                          {(acc.subAccounts ?? []).map((sub) => {
                            const lastTx = [...transactions]
                              .filter(
                                (t) => t.account === `${acc.id}>${sub.id}`,
                              )
                              .sort((a, b) => b.date.localeCompare(a.date))[0];
                            return (
                              <div
                                key={sub.id}
                                className="flex items-center gap-2 p-2.5 rounded-xl border border-border"
                                style={{
                                  backgroundColor:
                                    "oklch(var(--secondary) / 0.3)",
                                }}
                              >
                                <div
                                  className="w-2 h-8 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor:
                                      sub.color ?? acc.color ?? "#888",
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-foreground truncate">
                                    {sub.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {lastTx
                                      ? `Last: ${format(parseISO(lastTx.date), "MMM d")}`
                                      : "No activity"}
                                  </p>
                                </div>
                                <span
                                  className="text-sm font-bold flex-shrink-0"
                                  style={{ color: "oklch(var(--primary))" }}
                                >
                                  {formatAmount(sub.balance, currency)}
                                </span>
                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSubAccountHistory({
                                        parentId: acc.id,
                                        subId: sub.id,
                                        name: sub.name,
                                      })
                                    }
                                    className="p-1 rounded text-muted-foreground"
                                    style={{
                                      backgroundColor:
                                        "oklch(var(--secondary))",
                                    }}
                                    title="View history"
                                  >
                                    <Clock size={10} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditSubAccountState({
                                        parentId: acc.id,
                                        sub,
                                      });
                                      setSubAccountForm({
                                        name: sub.name,
                                        balance: sub.balance.toString(),
                                        openingDate:
                                          sub.openingDate ??
                                          format(new Date(), "yyyy-MM-dd"),
                                        color: sub.color ?? "#888888",
                                      });
                                    }}
                                    className="p-1 rounded text-muted-foreground"
                                    style={{
                                      backgroundColor:
                                        "oklch(var(--secondary))",
                                    }}
                                    title="Edit sub-account"
                                  >
                                    <Pencil size={10} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteSubAccount(acc.id, sub.id);
                                      toast.success(`${sub.name} deleted`);
                                    }}
                                    className="p-1 rounded"
                                    style={{
                                      backgroundColor: "#EB575722",
                                      color: "#EB5757",
                                    }}
                                    title="Delete sub-account"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add sub-account button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSubAccount(acc.id);
                      setSubAccountForm({
                        name: "",
                        balance: "",
                        openingDate: format(new Date(), "yyyy-MM-dd"),
                        color: acc.color ?? "#888888",
                      });
                    }}
                    className="mt-2 flex items-center gap-1 text-xs px-2 py-1 rounded-lg w-full"
                    style={{
                      backgroundColor: `${acc.color ?? "#888"}11`,
                      color: acc.color ?? "oklch(var(--muted-foreground))",
                    }}
                    data-ocid={`accounts.sub_account.button.${idx + 1}`}
                  >
                    <Plus size={11} />
                    Add sub-account
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* IOU / Utang Tracker Section */}
      <Collapsible
        open={!isAccCollapsed("iou")}
        onOpenChange={(open) => {
          setAccountsCollapsed((prev) => {
            const next = { ...prev, iou: !open };
            try {
              localStorage.setItem(ACCOUNTS_COLLAPSE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
        }}
      >
        <div
          className="rounded-2xl border border-border mb-4 overflow-hidden"
          style={{ backgroundColor: "oklch(var(--card))" }}
          data-ocid="accounts.iou.panel"
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left"
              data-ocid="accounts.iou.toggle"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#20D18A22" }}
                >
                  <HandCoins size={15} style={{ color: "#20D18A" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    IOU / Utang Tracker
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {totalIOUsOwed > 0 && (
                      <span style={{ color: "#20D18A" }}>
                        {formatAmount(totalIOUsOwed, currency)} owed to you
                      </span>
                    )}
                    {totalIOUsOwed > 0 && totalIOUsBorrowed > 0 && " · "}
                    {totalIOUsBorrowed > 0 && (
                      <span style={{ color: "#EB5757" }}>
                        {formatAmount(totalIOUsBorrowed, currency)} you owe
                      </span>
                    )}
                    {totalIOUsOwed === 0 &&
                      totalIOUsBorrowed === 0 &&
                      "No active IOUs"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isAccCollapsed("iou") ? (
                  <ChevronUp size={16} className="text-muted-foreground" />
                ) : (
                  <ChevronDown size={16} className="text-muted-foreground" />
                )}
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4">
              {/* Lent / Borrowed tabs */}
              <div
                className="flex rounded-xl overflow-hidden border mb-3"
                style={{ borderColor: "oklch(var(--border))" }}
              >
                <button
                  type="button"
                  onClick={() => setIouTab("lent")}
                  className="flex-1 py-2 text-xs font-semibold transition-all"
                  style={{
                    backgroundColor:
                      iouTab === "lent" ? "#20D18A" : "oklch(var(--secondary))",
                    color:
                      iouTab === "lent"
                        ? "#000"
                        : "oklch(var(--muted-foreground))",
                  }}
                  data-ocid="accounts.iou.lent.tab"
                >
                  Lent{" "}
                  {lentIOUs.filter(
                    (i) => i.status === "current" || i.status === "overdue",
                  ).length > 0 &&
                    `(${lentIOUs.filter((i) => i.status === "current" || i.status === "overdue").length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setIouTab("borrowed")}
                  className="flex-1 py-2 text-xs font-semibold transition-all"
                  style={{
                    backgroundColor:
                      iouTab === "borrowed"
                        ? "#EB5757"
                        : "oklch(var(--secondary))",
                    color:
                      iouTab === "borrowed"
                        ? "#fff"
                        : "oklch(var(--muted-foreground))",
                  }}
                  data-ocid="accounts.iou.borrowed.tab"
                >
                  Borrowed{" "}
                  {borrowedIOUs.filter(
                    (i) => i.status === "current" || i.status === "overdue",
                  ).length > 0 &&
                    `(${borrowedIOUs.filter((i) => i.status === "current" || i.status === "overdue").length})`}
                </button>
              </div>

              {/* LENT TAB */}
              {iouTab === "lent" && (
                <div className="space-y-3">
                  <Button
                    className="w-full gap-2"
                    size="sm"
                    style={{
                      backgroundColor: "#20D18A22",
                      color: "#20D18A",
                      border: "1px solid #20D18A44",
                    }}
                    onClick={() => setShowAddIOU(true)}
                    data-ocid="accounts.iou.add.open_modal_button"
                  >
                    <Plus size={13} /> Add IOU (Lent)
                  </Button>

                  {lentIOUs.length === 0 ? (
                    <div
                      className="text-center py-6"
                      data-ocid="accounts.iou.empty_state"
                    >
                      <HandCoins
                        size={28}
                        className="mx-auto mb-2 text-muted-foreground opacity-40"
                      />
                      <p className="text-sm text-muted-foreground">
                        No lent IOUs
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Add someone who owes you money
                      </p>
                    </div>
                  ) : (
                    lentIOUs.map((iou, idx) => renderIOUCard(iou, idx, "lent"))
                  )}
                </div>
              )}

              {/* BORROWED TAB */}
              {iouTab === "borrowed" && (
                <div className="space-y-3">
                  <Button
                    className="w-full gap-2"
                    size="sm"
                    style={{
                      backgroundColor: "#EB575722",
                      color: "#EB5757",
                      border: "1px solid #EB575744",
                    }}
                    onClick={() => setShowAddBorrowedIOU(true)}
                    data-ocid="accounts.iou.borrow.open_modal_button"
                  >
                    <Plus size={13} /> Add Borrowed IOU
                  </Button>

                  {borrowedIOUs.length === 0 ? (
                    <div
                      className="text-center py-6"
                      data-ocid="accounts.iou.borrowed.empty_state"
                    >
                      <HandCoins
                        size={28}
                        className="mx-auto mb-2 text-muted-foreground opacity-40"
                      />
                      <p className="text-sm text-muted-foreground">
                        No borrowed IOUs
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Track money you borrowed from others
                      </p>
                    </div>
                  ) : (
                    borrowedIOUs.map((iou, idx) =>
                      renderIOUCard(iou, idx, "borrowed"),
                    )
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Bill Tracker Section */}
      <Collapsible
        open={!isAccCollapsed("bills")}
        onOpenChange={(open) => {
          setAccountsCollapsed((prev) => {
            const next = { ...prev, bills: !open };
            try {
              localStorage.setItem(ACCOUNTS_COLLAPSE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
        }}
      >
        <div
          className="rounded-2xl border border-border mb-4 overflow-hidden"
          style={{ backgroundColor: "oklch(var(--card))" }}
          data-ocid="accounts.bills.panel"
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left"
              data-ocid="accounts.bills.toggle"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#F2C94C22" }}
                >
                  <Receipt size={15} style={{ color: "#F2C94C" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Bill Tracker
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {bills.filter((b) => b.isPaidThisPeriod).length}/
                    {bills.length} paid this period
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <HelpSheet
                  section="billTracker"
                  language={config?.language ?? "en"}
                />
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: "oklch(var(--primary) / 0.15)",
                    color: "oklch(var(--primary))",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    resetBillForm();
                    setEditBill(null);
                    setShowAddBill(true);
                  }}
                  data-ocid="accounts.bills.add_button"
                  aria-label="Add Bill"
                >
                  <Plus size={13} />
                </button>
                {!isAccCollapsed("bills") ? (
                  <ChevronUp size={16} className="text-muted-foreground" />
                ) : (
                  <ChevronDown size={16} className="text-muted-foreground" />
                )}
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4">
              {/* Due Soon Banner */}
              {billsDueSoon.length > 0 && (
                <div
                  className="rounded-xl p-3 mb-3 flex items-start gap-2"
                  style={{
                    backgroundColor: "#F2C94C18",
                    borderLeft: "3px solid #F2C94C",
                  }}
                  data-ocid="accounts.bills.due_soon.card"
                >
                  <AlertTriangle
                    size={14}
                    style={{ color: "#F2C94C" }}
                    className="flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <p
                      className="text-xs font-semibold"
                      style={{ color: "#F2C94C" }}
                    >
                      Due Soon
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {billsDueSoon
                        .map((b) => `${b.name} (${ordinal(b.dueDayOfMonth)})`)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Bills list */}
              {bills.length === 0 ? (
                <div
                  className="text-center py-6"
                  data-ocid="accounts.bills.empty_state"
                >
                  <Receipt
                    size={28}
                    className="mx-auto mb-2 text-muted-foreground opacity-40"
                  />
                  <p className="text-sm text-muted-foreground">
                    No bills added yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tap + Add Bill to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bills.map((bill, idx) => (
                    <div
                      key={bill.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border"
                      style={{
                        backgroundColor: "oklch(var(--secondary) / 0.4)",
                      }}
                      data-ocid={`accounts.bills.item.${idx + 1}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleBillPaid(bill.id)}
                        className="flex-shrink-0"
                        data-ocid={`accounts.bills.toggle_paid.${idx + 1}`}
                        aria-label={
                          bill.isPaidThisPeriod ? "Mark unpaid" : "Mark paid"
                        }
                      >
                        {bill.isPaidThisPeriod ? (
                          <CheckCircle2
                            size={20}
                            style={{ color: "#20D18A" }}
                          />
                        ) : (
                          <Circle size={20} className="text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${bill.isPaidThisPeriod ? "line-through text-muted-foreground" : "text-foreground"}`}
                        >
                          {bill.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatAmount(bill.amount, currency)} · Due:{" "}
                          {ordinal(bill.dueDayOfMonth)}
                        </p>
                        {bill.notes && (
                          <p className="text-[10px] text-muted-foreground italic mt-0.5">
                            {bill.notes}
                          </p>
                        )}
                      </div>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={
                          bill.isPaidThisPeriod
                            ? { backgroundColor: "#20D18A22", color: "#20D18A" }
                            : {
                                backgroundColor: "oklch(var(--muted))",
                                color: "oklch(var(--muted-foreground))",
                              }
                        }
                      >
                        {bill.isPaidThisPeriod ? "Paid" : "Unpaid"}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="p-1 rounded-lg text-muted-foreground"
                            data-ocid={`accounts.bills.menu.${idx + 1}`}
                            aria-label="Bill options"
                          >
                            <MoreVertical size={14} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditBill(bill);
                              setBillForm({
                                name: bill.name,
                                amount: String(bill.amount),
                                dueDayOfMonth: String(bill.dueDayOfMonth),
                                notes: bill.notes ?? "",
                              });
                              setShowAddBill(true);
                            }}
                            data-ocid={`accounts.bills.edit_button.${idx + 1}`}
                          >
                            <Pencil size={13} className="mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              deleteBill(bill.id);
                              toast.success("Bill deleted");
                            }}
                            data-ocid={`accounts.bills.delete_button.${idx + 1}`}
                          >
                            <Trash2 size={13} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Add/Edit Bill Dialog */}
      <Dialog
        open={showAddBill}
        onOpenChange={(o) => {
          if (!o) {
            setShowAddBill(false);
            setEditBill(null);
            resetBillForm();
          }
        }}
      >
        <DialogContent data-ocid="accounts.bills.dialog">
          <DialogHeader>
            <DialogTitle>{editBill ? "Edit Bill" : "Add Bill"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Bill Name</Label>
              <Input
                value={billForm.name}
                onChange={(e) =>
                  setBillForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Electricity"
                className="mt-1"
                data-ocid="accounts.bills.name.input"
              />
            </div>
            <div>
              <Label className="text-xs">Amount (₱)</Label>
              <Input
                type="number"
                value={billForm.amount}
                onChange={(e) =>
                  setBillForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="0.00"
                className="mt-1"
                data-ocid="accounts.bills.amount.input"
              />
            </div>
            <div>
              <Label className="text-xs">Due Day of Month (1–31)</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={billForm.dueDayOfMonth}
                onChange={(e) =>
                  setBillForm((f) => ({ ...f, dueDayOfMonth: e.target.value }))
                }
                placeholder="e.g. 15"
                className="mt-1"
                data-ocid="accounts.bills.due_day.input"
              />
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                value={billForm.notes}
                onChange={(e) =>
                  setBillForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Any notes..."
                className="mt-1"
                rows={2}
                data-ocid="accounts.bills.notes.textarea"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddBill(false);
                setEditBill(null);
                resetBillForm();
              }}
              data-ocid="accounts.bills.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveBill}
              data-ocid="accounts.bills.save_button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer History */}
      {transferHistory.length > 0 && (
        <div
          className="rounded-2xl border border-border mb-4"
          style={{ backgroundColor: "oklch(var(--card))" }}
        >
          <button
            type="button"
            className="w-full flex items-center justify-between p-4"
            onClick={() => toggleAccountsSection("transferHistory")}
            data-ocid="accounts.transfer_history.toggle"
          >
            <h3 className="text-sm font-semibold text-muted-foreground">
              Recent Transfers
            </h3>
            {isAccCollapsed("transferHistory") ? (
              <ChevronDown size={14} className="text-muted-foreground" />
            ) : (
              <ChevronUp size={14} className="text-muted-foreground" />
            )}
          </button>
          {!isAccCollapsed("transferHistory") && (
            <div className="px-4 pb-4 space-y-2">
              {transferHistory.map((tx, i) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-1"
                  data-ocid={`accounts.transfer.item.${i + 1}`}
                >
                  <div>
                    <p className="text-sm text-foreground">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(tx.date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color:
                        tx.type === "income"
                          ? "oklch(var(--primary))"
                          : "#EB5757",
                    }}
                  >
                    {tx.type === "income" ? "+" : "-"}
                    {formatAmount(tx.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Account History Dialog */}
      <Dialog
        open={!!historyAccount}
        onOpenChange={(o) => !o && setHistoryAccount(null)}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto"
          data-ocid="accounts.history.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {historyAccount?.name} — Transaction History
            </DialogTitle>
          </DialogHeader>
          {historyAccount &&
            (() => {
              const accTxs = allAccountTransactions.filter(
                (tx) => tx.account === historyAccount.name,
              );
              if (accTxs.length === 0) {
                return (
                  <div
                    className="text-center py-10"
                    data-ocid="accounts.history.empty_state"
                  >
                    <p className="text-muted-foreground text-sm">
                      No transactions found for this account
                    </p>
                  </div>
                );
              }
              // Build a lookup of period for each tx id
              const txPeriodLabel: Record<string, string> = {};
              for (const p of periods) {
                for (const tx of p.transactions) {
                  try {
                    txPeriodLabel[tx.id] =
                      `${format(parseISO(p.startDate), "MMM d")}–${format(parseISO(p.endDate), "MMM d")}`;
                  } catch {
                    txPeriodLabel[tx.id] = "Archived";
                  }
                }
              }
              return (
                <div className="space-y-2 mt-2">
                  {accTxs.map((tx, i) => {
                    const isTransfer = tx.mainCategory === "Transfer";
                    const isIncome = tx.type === "income" && !isTransfer;
                    const isExpense = tx.type === "expense" && !isTransfer;
                    const periodLabel = txPeriodLabel[tx.id];
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border"
                        style={{
                          backgroundColor: "oklch(var(--secondary) / 0.4)",
                        }}
                        data-ocid={`accounts.history.item.${i + 1}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground truncate">
                              {tx.description ||
                                tx.subCategory ||
                                tx.mainCategory}
                            </p>
                            <span
                              className="text-sm font-bold ml-2 flex-shrink-0"
                              style={{
                                color: isIncome
                                  ? "#20D18A"
                                  : isTransfer
                                    ? "oklch(var(--muted-foreground))"
                                    : "#EB5757",
                              }}
                            >
                              {isIncome ? "+" : isExpense ? "-" : ""}
                              {formatAmount(tx.amount, currency)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">
                              {format(parseISO(tx.date), "MMM d, yyyy")}
                            </span>
                            {/* Type badge */}
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: isIncome
                                  ? "#20D18A22"
                                  : isTransfer
                                    ? "#6366F122"
                                    : "#EB575722",
                                color: isIncome
                                  ? "#20D18A"
                                  : isTransfer
                                    ? "#6366F1"
                                    : "#EB5757",
                              }}
                            >
                              {isTransfer
                                ? "Transfer"
                                : isIncome
                                  ? "Income"
                                  : "Expense"}
                            </span>
                            {/* Subcategory */}
                            {tx.subCategory && !isTransfer && (
                              <span className="text-[9px] text-muted-foreground">
                                {tx.mainCategory} · {tx.subCategory}
                              </span>
                            )}
                            {/* Period badge for archived */}
                            {periodLabel && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: "oklch(var(--muted))",
                                  color: "oklch(var(--muted-foreground))",
                                }}
                              >
                                {periodLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setHistoryAccount(null)}
              data-ocid="accounts.history.close_button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Sub-account Dialog */}
      {(showAddSubAccount || editSubAccountState) && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl p-5 max-h-[70vh] flex flex-col"
            style={{ backgroundColor: "oklch(var(--card))" }}
            data-ocid="accounts.sub_account.dialog"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="font-bold text-foreground">
                {editSubAccountState ? "Edit Sub-account" : "Add Sub-account"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddSubAccount(null);
                  setEditSubAccountState(null);
                }}
              >
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto">
              <div>
                <Label className="text-xs">Name</Label>
                <input
                  type="text"
                  value={subAccountForm.name}
                  onChange={(e) =>
                    setSubAccountForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Parked Funds"
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
                  data-ocid="accounts.sub_account.input"
                />
              </div>
              {!editSubAccountState && (
                <>
                  <div>
                    <Label className="text-xs">
                      Opening Balance (optional)
                    </Label>
                    <input
                      type="number"
                      value={subAccountForm.balance}
                      onChange={(e) =>
                        setSubAccountForm((p) => ({
                          ...p,
                          balance: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      min="0"
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
                      data-ocid="accounts.sub_account.balance.input"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Opening Date</Label>
                    <input
                      type="date"
                      value={subAccountForm.openingDate}
                      onChange={(e) =>
                        setSubAccountForm((p) => ({
                          ...p,
                          openingDate: e.target.value,
                        }))
                      }
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </>
              )}
              <div>
                <Label className="text-xs">Color (optional)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={subAccountForm.color}
                    onChange={(e) =>
                      setSubAccountForm((p) => ({
                        ...p,
                        color: e.target.value,
                      }))
                    }
                    className="w-8 h-8 rounded cursor-pointer border border-border"
                  />
                  <span className="text-xs text-muted-foreground">
                    {subAccountForm.color}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-3 flex-shrink-0">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAddSubAccount(null);
                  setEditSubAccountState(null);
                }}
                data-ocid="accounts.sub_account.cancel_button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  const subName = subAccountForm.name.trim();
                  if (!subName) {
                    toast.error("Name is required");
                    return;
                  }
                  if (editSubAccountState) {
                    editSubAccount(
                      editSubAccountState.parentId,
                      editSubAccountState.sub.id,
                      {
                        name: subName,
                        color: subAccountForm.color || undefined,
                      },
                    );
                    toast.success("Sub-account updated");
                    setEditSubAccountState(null);
                  } else if (showAddSubAccount) {
                    const openingBalance =
                      Number.parseFloat(subAccountForm.balance) || 0;
                    addSubAccount(showAddSubAccount, {
                      name: subName,
                      balance: openingBalance,
                      openingBalance:
                        openingBalance > 0 ? openingBalance : undefined,
                      openingDate: subAccountForm.openingDate || undefined,
                      color: subAccountForm.color || undefined,
                    });
                    toast.success(`${subName} added`);
                    setShowAddSubAccount(null);
                  }
                }}
                style={{
                  backgroundColor: "oklch(var(--primary))",
                  color: "oklch(var(--primary-foreground))",
                }}
                data-ocid="accounts.sub_account.save_button"
              >
                {editSubAccountState ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-account history sheet */}
      {subAccountHistory &&
        (() => {
          const subTxKey = `${subAccountHistory.parentId}>${subAccountHistory.subId}`;
          const subTxs = [...allAccountTransactions]
            .filter((t) => t.account === subTxKey)
            .sort((a, b) => b.date.localeCompare(a.date));
          return (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <div
                className="w-full max-w-lg rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto pb-24"
                style={{ backgroundColor: "oklch(var(--card))" }}
                data-ocid="accounts.sub_account_history.sheet"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-foreground">
                      {subAccountHistory.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Sub-account history
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubAccountHistory(null)}
                  >
                    <X size={18} className="text-muted-foreground" />
                  </button>
                </div>
                {subTxs.length === 0 ? (
                  <div
                    className="text-center py-8"
                    data-ocid="accounts.sub_account_history.empty_state"
                  >
                    <p className="text-muted-foreground text-sm">
                      No transactions yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subTxs.map((tx, i) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{ backgroundColor: "oklch(var(--secondary))" }}
                        data-ocid={`accounts.sub_account_history.item.${i + 1}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {tx.description || tx.subCategory}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(parseISO(tx.date), "MMM d, yyyy")} ·{" "}
                            {tx.mainCategory}
                          </p>
                        </div>
                        <span
                          className="text-sm font-bold ml-2 flex-shrink-0"
                          style={{
                            color:
                              tx.type === "income"
                                ? "oklch(var(--primary))"
                                : "#EB5757",
                          }}
                        >
                          {tx.type === "income" ? "+" : "-"}
                          {formatAmount(tx.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {/* Add Account Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto"
          data-ocid="accounts.add.dialog"
        >
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Account Type</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {ACCOUNT_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset.name}
                    onClick={() => handlePresetSelect(preset.name)}
                    className="flex items-center gap-2 p-2 rounded-xl border text-left text-sm transition-all"
                    style={{
                      borderColor:
                        form.preset === preset.name
                          ? preset.color
                          : "oklch(var(--border))",
                      backgroundColor:
                        form.preset === preset.name
                          ? `${preset.color}22`
                          : "oklch(var(--secondary))",
                      color:
                        form.preset === preset.name
                          ? preset.color
                          : "oklch(var(--foreground))",
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: preset.color }}
                    />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {(form.preset === "Custom" || form.preset) && (
              <>
                {form.preset === "Custom" && (
                  <div>
                    <Label>Account Name</Label>
                    <Input
                      value={form.customName}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          customName: e.target.value,
                        }))
                      }
                      placeholder="e.g. HSBC Savings"
                      className="mt-1"
                      data-ocid="accounts.add.input"
                    />
                  </div>
                )}

                {form.preset === "Custom" && (
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          type: v as AccountType,
                        }))
                      }
                    >
                      <SelectTrigger
                        className="mt-1"
                        data-ocid="accounts.add.select"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="ewallet">E-Wallet</SelectItem>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="credit">Credit Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>
                    {form.type === "credit"
                      ? "Current Balance Owed"
                      : "Current Balance"}
                  </Label>
                  <Input
                    type="number"
                    value={form.balance}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, balance: e.target.value }))
                    }
                    placeholder="0.00"
                    min="0"
                    className="mt-1"
                    data-ocid="accounts.add_balance.input"
                  />
                </div>

                {form.type === "credit" && (
                  <>
                    <div>
                      <Label>Credit Limit</Label>
                      <Input
                        type="number"
                        value={form.creditLimit}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            creditLimit: e.target.value,
                          }))
                        }
                        placeholder="e.g. 50000"
                        min="0"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>APR (%)</Label>
                      <Input
                        type="number"
                        value={form.apr}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, apr: e.target.value }))
                        }
                        placeholder="e.g. 3.5"
                        min="0"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Monthly Due Date</Label>
                      <Input
                        type="date"
                        value={form.dueDate}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            dueDate: e.target.value,
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAdd(false)}
              data-ocid="accounts.add.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddAccount}
              style={{
                backgroundColor: "oklch(var(--primary))",
                color: "oklch(var(--primary-foreground))",
              }}
              data-ocid="accounts.add.submit_button"
            >
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent data-ocid="accounts.transfer.dialog">
          <DialogHeader>
            <DialogTitle>Transfer Between Accounts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>From Account</Label>
              <Select
                value={transferForm.fromId}
                onValueChange={(v) =>
                  setTransferForm((prev) => ({ ...prev, fromId: v }))
                }
              >
                <SelectTrigger
                  className="mt-1"
                  data-ocid="accounts.transfer_from.select"
                >
                  <SelectValue placeholder="Select source account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.flatMap((acc) => [
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({formatAmount(acc.balance, currency)})
                    </SelectItem>,
                    ...(acc.subAccounts ?? []).map((sub) => (
                      <SelectItem
                        key={`${acc.id}>${sub.id}`}
                        value={`${acc.id}>${sub.id}`}
                      >
                          {acc.name} › {sub.name} (
                        {formatAmount(sub.balance, currency)})
                      </SelectItem>
                    )),
                  ])}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To Account</Label>
              <Select
                value={transferForm.toId}
                onValueChange={(v) =>
                  setTransferForm((prev) => ({ ...prev, toId: v }))
                }
              >
                <SelectTrigger
                  className="mt-1"
                  data-ocid="accounts.transfer_to.select"
                >
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.flatMap((acc) => [
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({formatAmount(acc.balance, currency)})
                    </SelectItem>,
                    ...(acc.subAccounts ?? []).map((sub) => (
                      <SelectItem
                        key={`${acc.id}>${sub.id}`}
                        value={`${acc.id}>${sub.id}`}
                      >
                          {acc.name} › {sub.name} (
                        {formatAmount(sub.balance, currency)})
                      </SelectItem>
                    )),
                  ])}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={transferForm.amount}
                onChange={(e) =>
                  setTransferForm((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                placeholder="0.00"
                min="0"
                className="mt-1"
                data-ocid="accounts.transfer_amount.input"
              />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input
                value={transferForm.note}
                onChange={(e) =>
                  setTransferForm((prev) => ({ ...prev, note: e.target.value }))
                }
                placeholder="e.g. Weekly allowance"
                className="mt-1"
                data-ocid="accounts.transfer_note.input"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowTransfer(false)}
              data-ocid="accounts.transfer.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              style={{
                backgroundColor: "oklch(var(--primary))",
                color: "oklch(var(--primary-foreground))",
              }}
              data-ocid="accounts.transfer.confirm_button"
            >
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog
        open={!!editAccount}
        onOpenChange={(o) => !o && setEditAccount(null)}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto"
          data-ocid="accounts.edit.dialog"
        >
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          {editAccount && (
            <div className="space-y-4">
              <div>
                <Label>Account Name</Label>
                <Input
                  value={editAccount.name}
                  onChange={(e) =>
                    setEditAccount((prev) =>
                      prev ? { ...prev, name: e.target.value } : prev,
                    )
                  }
                  className="mt-1"
                  data-ocid="accounts.edit_name.input"
                />
              </div>
              <div>
                <Label>Balance</Label>
                <Input
                  type="number"
                  value={editAccount.balance}
                  onChange={(e) =>
                    setEditAccount((prev) =>
                      prev
                        ? {
                            ...prev,
                            balance: Number.parseFloat(e.target.value) || 0,
                          }
                        : prev,
                    )
                  }
                  className="mt-1"
                  data-ocid="accounts.edit_balance.input"
                />
              </div>
              {editAccount.type === "credit" && (
                <>
                  <div>
                    <Label>Credit Limit</Label>
                    <Input
                      type="number"
                      value={editAccount.creditLimit ?? ""}
                      onChange={(e) =>
                        setEditAccount((prev) =>
                          prev
                            ? {
                                ...prev,
                                creditLimit:
                                  Number.parseFloat(e.target.value) || 0,
                              }
                            : prev,
                        )
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Monthly Due Date</Label>
                    <Input
                      type="date"
                      value={editAccount.dueDate ?? ""}
                      onChange={(e) =>
                        setEditAccount((prev) =>
                          prev ? { ...prev, dueDate: e.target.value } : prev,
                        )
                      }
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditAccount(null)}
              data-ocid="accounts.edit.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              style={{
                backgroundColor: "oklch(var(--primary))",
                color: "oklch(var(--primary-foreground))",
              }}
              data-ocid="accounts.edit.save_button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent data-ocid="accounts.delete.dialog">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this account? This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              data-ocid="accounts.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (deleteId) {
                  deleteAccount(deleteId);
                  setDeleteId(null);
                  toast.success("Account deleted");
                }
              }}
              style={{ backgroundColor: "#EB5757", color: "#fff" }}
              data-ocid="accounts.delete.confirm_button"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lent IOU Dialog */}
      <Dialog
        open={showAddIOU}
        onOpenChange={(o) => !o && setShowAddIOU(false)}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto"
          data-ocid="accounts.iou.add.dialog"
        >
          <DialogHeader>
            <DialogTitle>Add IOU — Lent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="iou-person">Person Name</Label>
              <Input
                id="iou-person"
                value={iouForm.personName}
                onChange={(e) =>
                  setIouForm((prev) => ({
                    ...prev,
                    personName: e.target.value,
                  }))
                }
                placeholder="e.g. John"
                className="mt-1"
                data-ocid="accounts.iou.add_person.input"
              />
            </div>
            <div>
              <Label htmlFor="iou-amount">Amount Lent</Label>
              <Input
                id="iou-amount"
                type="number"
                value={iouForm.amountLent}
                onChange={(e) =>
                  setIouForm((prev) => ({
                    ...prev,
                    amountLent: e.target.value,
                  }))
                }
                placeholder="0.00"
                min="0"
                className="mt-1"
                data-ocid="accounts.iou.add_amount.input"
              />
            </div>
            <div>
              <Label>Source Account (optional)</Label>
              <Select
                value={iouForm.sourceAccountId}
                onValueChange={(v) =>
                  setIouForm((prev) => ({ ...prev, sourceAccountId: v }))
                }
              >
                <SelectTrigger
                  className="mt-1"
                  data-ocid="accounts.iou.add_source.select"
                >
                  <SelectValue placeholder="Which account did you lend from?" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="iou-date-lent">Date Lent</Label>
              <Input
                id="iou-date-lent"
                type="date"
                value={iouForm.dateLent}
                onChange={(e) =>
                  setIouForm((prev) => ({ ...prev, dateLent: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="iou-due">Due Date</Label>
              <Input
                id="iou-due"
                type="date"
                value={iouForm.dueDate}
                onChange={(e) =>
                  setIouForm((prev) => ({ ...prev, dueDate: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="iou-interest">Interest % (optional)</Label>
              <Input
                id="iou-interest"
                type="number"
                value={iouForm.interestPct}
                onChange={(e) =>
                  setIouForm((prev) => ({
                    ...prev,
                    interestPct: e.target.value,
                  }))
                }
                placeholder="e.g. 5"
                min="0"
                className="mt-1"
                data-ocid="accounts.iou.add_interest.input"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddIOU(false)}
              data-ocid="accounts.iou.add.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddIOU}
              style={{ backgroundColor: "#20D18A", color: "#000" }}
              data-ocid="accounts.iou.add.submit_button"
            >
              Add IOU
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Borrowed IOU Dialog */}
      <Dialog
        open={showAddBorrowedIOU}
        onOpenChange={(o) => !o && setShowAddBorrowedIOU(false)}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto"
          data-ocid="accounts.iou.borrow.dialog"
        >
          <DialogHeader>
            <DialogTitle>Add Borrowed IOU</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Track money you borrowed from someone else.
          </p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="borrow-person">Person Name</Label>
              <Input
                id="borrow-person"
                value={borrowedForm.personName}
                onChange={(e) =>
                  setBorrowedForm((prev) => ({
                    ...prev,
                    personName: e.target.value,
                  }))
                }
                placeholder="e.g. Nanay"
                className="mt-1"
                data-ocid="accounts.iou.borrow_person.input"
              />
            </div>
            <div>
              <Label htmlFor="borrow-amount">Amount Borrowed</Label>
              <Input
                id="borrow-amount"
                type="number"
                value={borrowedForm.amountLent}
                onChange={(e) =>
                  setBorrowedForm((prev) => ({
                    ...prev,
                    amountLent: e.target.value,
                  }))
                }
                placeholder="0.00"
                min="0"
                className="mt-1"
                data-ocid="accounts.iou.borrow_amount.input"
              />
            </div>
            <div>
              <Label>Destination Account (optional)</Label>
              <Select
                value={borrowedForm.destAccountId}
                onValueChange={(v) =>
                  setBorrowedForm((prev) => ({ ...prev, destAccountId: v }))
                }
              >
                <SelectTrigger
                  className="mt-1"
                  data-ocid="accounts.iou.borrow_dest.select"
                >
                  <SelectValue placeholder="Which account received the money?" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="borrow-date">Date Borrowed</Label>
              <Input
                id="borrow-date"
                type="date"
                value={borrowedForm.dateLent}
                onChange={(e) =>
                  setBorrowedForm((prev) => ({
                    ...prev,
                    dateLent: e.target.value,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="borrow-due">Due Date</Label>
              <Input
                id="borrow-due"
                type="date"
                value={borrowedForm.dueDate}
                onChange={(e) =>
                  setBorrowedForm((prev) => ({
                    ...prev,
                    dueDate: e.target.value,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="borrow-interest">Interest % (optional)</Label>
              <Input
                id="borrow-interest"
                type="number"
                value={borrowedForm.interestPct}
                onChange={(e) =>
                  setBorrowedForm((prev) => ({
                    ...prev,
                    interestPct: e.target.value,
                  }))
                }
                placeholder="e.g. 5"
                min="0"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddBorrowedIOU(false)}
              data-ocid="accounts.iou.borrow.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddBorrowedIOU}
              style={{ backgroundColor: "#EB5757", color: "#fff" }}
              data-ocid="accounts.iou.borrow.submit_button"
            >
              Add Borrowed IOU
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Repayment (Lent IOU — you receive money) */}
      <Dialog
        open={!!repayingIOU}
        onOpenChange={(o) => !o && setRepayingIOU(null)}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto"
          data-ocid="accounts.iou.repay.dialog"
        >
          <DialogHeader>
            <DialogTitle>Log Repayment — {repayingIOU?.personName}</DialogTitle>
          </DialogHeader>
          {repayingIOU && (
            <div className="space-y-4">
              <div
                className="p-3 rounded-xl text-sm"
                style={{
                  backgroundColor: "oklch(var(--secondary))",
                  color: "oklch(var(--muted-foreground))",
                }}
              >
                Outstanding:{" "}
                <strong style={{ color: "oklch(var(--foreground))" }}>
                  {formatAmount(getIOUBalance(repayingIOU), currency)}
                </strong>
              </div>
              <div>
                <Label htmlFor="repay-amount">Amount Received</Label>
                <Input
                  id="repay-amount"
                  type="number"
                  value={repayForm.amount}
                  onChange={(e) =>
                    setRepayForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                  min="0"
                  className="mt-1"
                  data-ocid="accounts.iou.repay_amount.input"
                />
              </div>
              <div>
                <Label>Receive to Account</Label>
                <Select
                  value={repayForm.accountId}
                  onValueChange={(v) =>
                    setRepayForm((prev) => ({ ...prev, accountId: v }))
                  }
                >
                  <SelectTrigger
                    className="mt-1"
                    data-ocid="accounts.iou.repay_account.select"
                  >
                    <SelectValue placeholder="Which account received payment?" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="repay-date">Date</Label>
                <Input
                  id="repay-date"
                  type="date"
                  value={repayForm.date}
                  onChange={(e) =>
                    setRepayForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="repay-note">Note (optional)</Label>
                <Input
                  id="repay-note"
                  value={repayForm.note}
                  onChange={(e) =>
                    setRepayForm((prev) => ({ ...prev, note: e.target.value }))
                  }
                  placeholder="e.g. GCash transfer"
                  className="mt-1"
                  data-ocid="accounts.iou.repay_note.input"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRepayingIOU(null)}
              data-ocid="accounts.iou.repay.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRepayIOU}
              style={{
                backgroundColor: "oklch(var(--primary))",
                color: "oklch(var(--primary-foreground))",
              }}
              data-ocid="accounts.iou.repay.submit_button"
            >
              Log Repayment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Repay Borrowed IOU (you pay someone back) */}
      <Dialog
        open={!!repayBorrowedIOU_state}
        onOpenChange={(o) => !o && setRepayBorrowedIOU(null)}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto"
          data-ocid="accounts.iou.repay_borrowed.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              Repay to {repayBorrowedIOU_state?.personName}
            </DialogTitle>
          </DialogHeader>
          {repayBorrowedIOU_state && (
            <div className="space-y-4">
              <div
                className="p-3 rounded-xl text-sm"
                style={{
                  backgroundColor: "oklch(var(--secondary))",
                  color: "oklch(var(--muted-foreground))",
                }}
              >
                Still owe:{" "}
                <strong style={{ color: "#EB5757" }}>
                  {formatAmount(
                    getIOUBalance(repayBorrowedIOU_state),
                    currency,
                  )}
                </strong>
              </div>
              <div>
                <Label htmlFor="repay-borrowed-amount">Amount Repaid</Label>
                <Input
                  id="repay-borrowed-amount"
                  type="number"
                  value={repayBorrowedForm.amount}
                  onChange={(e) =>
                    setRepayBorrowedForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                  min="0"
                  className="mt-1"
                  data-ocid="accounts.iou.repay_borrowed_amount.input"
                />
              </div>
              <div>
                <Label>Pay From Account</Label>
                <Select
                  value={repayBorrowedForm.accountId}
                  onValueChange={(v) =>
                    setRepayBorrowedForm((prev) => ({
                      ...prev,
                      accountId: v,
                    }))
                  }
                >
                  <SelectTrigger
                    className="mt-1"
                    data-ocid="accounts.iou.repay_borrowed_account.select"
                  >
                    <SelectValue placeholder="Which account to pay from?" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({formatAmount(acc.balance, currency)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="repay-borrowed-date">Date</Label>
                <Input
                  id="repay-borrowed-date"
                  type="date"
                  value={repayBorrowedForm.date}
                  onChange={(e) =>
                    setRepayBorrowedForm((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="repay-borrowed-note">Note (optional)</Label>
                <Input
                  id="repay-borrowed-note"
                  value={repayBorrowedForm.note}
                  onChange={(e) =>
                    setRepayBorrowedForm((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  placeholder="e.g. Via GCash"
                  className="mt-1"
                  data-ocid="accounts.iou.repay_borrowed_note.input"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRepayBorrowedIOU(null)}
              data-ocid="accounts.iou.repay_borrowed.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRepayBorrowedIOU}
              style={{ backgroundColor: "#EB5757", color: "#fff" }}
              data-ocid="accounts.iou.repay_borrowed.submit_button"
            >
              Log Repayment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete IOU Dialog */}
      <Dialog
        open={!!deleteIOUId}
        onOpenChange={(o) => !o && setDeleteIOUId(null)}
      >
        <DialogContent data-ocid="accounts.iou.delete.dialog">
          <DialogHeader>
            <DialogTitle>Delete IOU</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this IOU record? This cannot be
            undone.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteIOUId(null)}
              data-ocid="accounts.iou.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (deleteIOUId) {
                  deleteIOU(deleteIOUId);
                  setDeleteIOUId(null);
                  toast.success("IOU deleted");
                }
              }}
              style={{ backgroundColor: "#EB5757", color: "#fff" }}
              data-ocid="accounts.iou.delete.confirm_button"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Helper: render IOU card (shared between lent/borrowed)
  function renderIOUCard(
    iou: IOU,
    idx: number,
    direction: "lent" | "borrowed",
  ) {
    const balance = getIOUBalance(iou);
    const isActive = iou.status === "current" || iou.status === "overdue";
    const expectedWithInterest = iou.interestPct
      ? iou.amountLent * (1 + iou.interestPct / 100)
      : null;
    const historyOpen = expandedIOUHistory.has(iou.id);
    const accentColor = direction === "lent" ? "#20D18A" : "#EB5757";
    const prefix = direction === "lent" ? "lent" : "borrowed";

    return (
      <div
        key={iou.id}
        className="rounded-xl border p-3"
        style={{
          borderColor:
            iou.status === "overdue"
              ? "#EB575744"
              : iou.status === "current"
                ? `${accentColor}33`
                : "oklch(var(--border))",
          backgroundColor:
            iou.status === "overdue"
              ? "#EB575708"
              : "oklch(var(--secondary) / 0.4)",
        }}
        data-ocid={`accounts.iou.${prefix}.item.${idx + 1}`}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-foreground">
                {iou.personName}
              </span>
              <IOUStatusBadge status={iou.status} />
            </div>
            {isActive && (
              <p
                className="text-lg font-bold mt-0.5"
                style={{ color: accentColor }}
              >
                {formatAmount(balance, currency)}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  {direction === "lent" ? "remaining" : "you owe"}
                </span>
              </p>
            )}
            {(iou.status === "paid" || iou.status === "forgiven") && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {iou.status === "forgiven"
                  ? `Forgiven ${formatAmount(iou.amountLent, currency)}`
                  : "Settled"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDeleteIOUId(iou.id)}
            className="p-1.5 rounded-lg flex-shrink-0"
            style={{ backgroundColor: "#EB575722", color: "#EB5757" }}
            data-ocid={`accounts.iou.${prefix}.delete_button.${idx + 1}`}
          >
            <Trash2 size={11} />
          </button>
        </div>

        {/* Details */}
        <div className="space-y-1 mb-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {direction === "lent" ? "Lent" : "Borrowed"}{" "}
              {formatAmount(iou.amountLent, currency)}
            </span>
            <span
              style={{
                color: iou.status === "overdue" ? "#EB5757" : undefined,
              }}
            >
              Due: {format(parseISO(iou.dueDate), "MMM d, yyyy")}
            </span>
          </div>
          {expectedWithInterest && (
            <p className="text-xs" style={{ color: "#F2C94C" }}>
              Expected w/interest:{" "}
              {formatAmount(expectedWithInterest, currency)} ({iou.interestPct}
              %)
            </p>
          )}
        </div>

        {/* Action buttons */}
        {isActive && (
          <div className="flex gap-2 mb-2">
            {direction === "lent" ? (
              <>
                <button
                  type="button"
                  className="flex-1 text-xs py-1.5 px-2 rounded-lg font-medium"
                  style={{
                    backgroundColor: "oklch(var(--primary) / 0.15)",
                    color: "oklch(var(--primary))",
                  }}
                  onClick={() => {
                    setRepayingIOU(iou);
                    setRepayForm({
                      amount: "",
                      accountId: "",
                      date: format(new Date(), "yyyy-MM-dd"),
                      note: "",
                    });
                  }}
                  data-ocid={`accounts.iou.lent.repay_button.${idx + 1}`}
                >
                  Log Repayment
                </button>
                <button
                  type="button"
                  className="text-xs py-1.5 px-2 rounded-lg font-medium"
                  style={{ backgroundColor: "#F2C94C22", color: "#F2C94C" }}
                  onClick={() => {
                    forgivenIOU(iou.id);
                    toast.success(
                      `IOU for ${iou.personName} marked as forgiven`,
                    );
                  }}
                  data-ocid={`accounts.iou.lent.forgive_button.${idx + 1}`}
                >
                  Forgive
                </button>
                <button
                  type="button"
                  className="text-xs py-1.5 px-2 rounded-lg font-medium"
                  style={{ backgroundColor: "#20D18A22", color: "#20D18A" }}
                  onClick={() => {
                    markIOUPaid(iou.id);
                    toast.success(`${iou.personName} marked as paid!`);
                  }}
                  data-ocid={`accounts.iou.lent.mark_paid_button.${idx + 1}`}
                >
                  Paid
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="flex-1 text-xs py-1.5 px-2 rounded-lg font-medium"
                  style={{ backgroundColor: "#EB575722", color: "#EB5757" }}
                  onClick={() => {
                    setRepayBorrowedIOU(iou);
                    setRepayBorrowedForm({
                      amount: "",
                      accountId: "",
                      date: format(new Date(), "yyyy-MM-dd"),
                      note: "",
                    });
                  }}
                  data-ocid={`accounts.iou.borrowed.repay_button.${idx + 1}`}
                >
                  Repay
                </button>
                <button
                  type="button"
                  className="text-xs py-1.5 px-2 rounded-lg font-medium"
                  style={{ backgroundColor: "#F2C94C22", color: "#F2C94C" }}
                  onClick={() => {
                    forgivenIOU(iou.id);
                    toast.success(`${iou.personName} forgave your debt`);
                  }}
                  data-ocid={`accounts.iou.borrowed.forgive_button.${idx + 1}`}
                >
                  Forgiven
                </button>
                <button
                  type="button"
                  className="text-xs py-1.5 px-2 rounded-lg font-medium"
                  style={{ backgroundColor: "#20D18A22", color: "#20D18A" }}
                  onClick={() => {
                    markIOUPaid(iou.id);
                    toast.success("Marked as settled!");
                  }}
                  data-ocid={`accounts.iou.borrowed.mark_paid_button.${idx + 1}`}
                >
                  Settled
                </button>
              </>
            )}
          </div>
        )}

        {/* History toggle */}
        <div>
          <button
            type="button"
            className="flex items-center gap-1 text-[10px] text-muted-foreground"
            onClick={() => toggleIOUHistory(iou.id)}
            data-ocid={`accounts.iou.${prefix}.history_button.${idx + 1}`}
          >
            <span>
              {historyOpen ? "Hide" : "Show"} History ({iou.events.length})
            </span>
            {historyOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>

          {historyOpen && (
            <div
              className="mt-2 space-y-1.5 pl-2 border-l-2"
              style={{ borderColor: "oklch(var(--border))" }}
            >
              {[...iou.events]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((ev) => {
                  const evAcc = ev.accountId
                    ? accounts.find((a) => a.id === ev.accountId)
                    : null;
                  return (
                    <div
                      key={ev.id}
                      className="flex items-start justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {EVENT_TYPE_LABELS[ev.type] ?? ev.type}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(parseISO(ev.date), "MMM d, yyyy")}
                          {evAcc ? ` • ${evAcc.name}` : ""}
                          {ev.note ? ` • ${ev.note}` : ""}
                        </p>
                      </div>
                      <span
                        className="text-xs font-semibold flex-shrink-0"
                        style={{
                          color:
                            ev.type === "repay" || ev.type === "paid"
                              ? "#20D18A"
                              : ev.type === "lend" || ev.type === "borrow"
                                ? "#EB5757"
                                : "oklch(var(--muted-foreground))",
                        }}
                      >
                        {ev.type === "repay"
                          ? "+"
                          : ev.type === "lend" || ev.type === "borrow"
                            ? "-"
                            : ""}
                        {formatAmount(ev.amount, currency)}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    );
  }
}
