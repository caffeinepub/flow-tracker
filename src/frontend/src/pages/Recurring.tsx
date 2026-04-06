import { Badge } from "@/components/ui/badge";
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
  addDays,
  addMonths,
  format,
  formatDistanceToNow,
  parseISO,
} from "date-fns";
import { Edit2, Plus, Repeat, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { HelpSheet } from "../components/HelpSheet";
import { formatAmount } from "../data/categories";
import { useFinanceData } from "../hooks/useFinanceData";
import type { RecurringFrequency, RecurringTransaction } from "../types";

function getNextDue(
  startDate: string,
  frequency: RecurringFrequency,
  lastGenerated: string | null,
): Date {
  const start = parseISO(startDate);
  if (!lastGenerated) return start; // never run — next due is the start date itself
  const base = parseISO(lastGenerated);
  if (frequency === "weekly") return addDays(base, 7);
  if (frequency === "biweekly") return addDays(base, 14);
  return addMonths(base, 1);
}

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
};

interface RecurringFormData {
  amount: string;
  mainCategory: string;
  subCategory: string;
  description: string;
  frequency: RecurringFrequency;
  startDate: string;
  isActive: boolean;
  account: string;
}

const emptyForm = (): RecurringFormData => ({
  amount: "",
  mainCategory: "",
  subCategory: "",
  description: "",
  frequency: "monthly",
  startDate: format(new Date(), "yyyy-MM-dd"),
  isActive: true,
  account: "",
});

export function Recurring() {
  const {
    config,
    customCategories,
    recurring,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    missedRecurring,
    accounts,
  } = useFinanceData();

  const currency = config?.currency ?? "PHP";

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<RecurringFormData>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const selectedCat = customCategories.find(
    (c) => c.name === form.mainCategory,
  );
  const subOptions = selectedCat?.subCategories ?? [];

  const openAdd = () => {
    setForm(emptyForm());
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (r: RecurringTransaction) => {
    setForm({
      amount: r.amount.toString(),
      mainCategory: r.mainCategory,
      subCategory: r.subCategory,
      description: r.description,
      frequency: r.frequency,
      startDate: r.startDate,
      isActive: r.isActive,
      account: r.account ?? "",
    });
    setEditId(r.id);
    setShowForm(true);
  };

  const handleSave = () => {
    const num = Number.parseFloat(form.amount);
    if (!num || num <= 0) {
      toast.error("Amount must be positive");
      return;
    }
    if (!form.mainCategory) {
      toast.error("Category is required");
      return;
    }
    if (editId) {
      // Preserve existing lastGenerated — do NOT pass lastGenerated: null when editing
      updateRecurring(editId, {
        amount: num,
        mainCategory: form.mainCategory,
        subCategory: form.subCategory,
        description: form.description,
        frequency: form.frequency,
        startDate: form.startDate,
        isActive: form.isActive,
        account: form.account || undefined,
      });
      toast.success("Recurring transaction updated!");
    } else {
      addRecurring({
        amount: num,
        mainCategory: form.mainCategory,
        subCategory: form.subCategory,
        description: form.description,
        frequency: form.frequency,
        startDate: form.startDate,
        isActive: form.isActive,
        lastGenerated: null,
        account: form.account || undefined,
      });
      toast.success("Recurring transaction added!");
    }
    setShowForm(false);
  };

  // Sort missed to top
  const missedIds = new Set(missedRecurring.map((r) => r.id));
  const sortedRecurring = [
    ...recurring.filter((r) => missedIds.has(r.id)),
    ...recurring.filter((r) => !missedIds.has(r.id)),
  ];

  return (
    <div className="pb-6 px-4 pt-2 fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">Recurring</h1>
          <HelpSheet section="recurring" language={config?.language ?? "en"} />
        </div>
        <Button
          size="sm"
          onClick={openAdd}
          className="gap-1"
          style={{
            backgroundColor: "oklch(var(--primary))",
            color: "oklch(var(--primary-foreground))",
          }}
          data-ocid="recurring.add.open_modal_button"
        >
          <Plus size={14} /> Add
        </Button>
      </div>

      {missedRecurring.length > 0 && (
        <div
          className="rounded-xl border p-3 mb-4 text-xs"
          style={{
            backgroundColor: "oklch(0.65 0.22 25 / 0.08)",
            borderColor: "oklch(0.65 0.22 25 / 0.4)",
            color: "#EB5757",
          }}
          data-ocid="recurring.missed.panel"
        >
          &#9888; {missedRecurring.length} rule
          {missedRecurring.length > 1 ? "s" : ""} may have been missed from a
          previous period.
        </div>
      )}

      {sortedRecurring.length === 0 ? (
        <div
          className="text-center py-16"
          data-ocid="recurring.list.empty_state"
        >
          <Repeat size={40} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            No recurring transactions yet.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={openAdd}
          >
            Add your first one
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRecurring.map((r, idx) => {
            const cat = customCategories.find((c) => c.name === r.mainCategory);
            const catColor = cat?.color ?? "#888";
            const nextDue = getNextDue(
              r.startDate,
              r.frequency,
              r.lastGenerated,
            );
            const nextDueLabel = formatDistanceToNow(nextDue, {
              addSuffix: true,
            });
            const isMissed = missedIds.has(r.id);
            return (
              <div
                key={r.id}
                className="rounded-2xl border p-4"
                style={{
                  backgroundColor: "oklch(var(--card))",
                  borderColor: isMissed
                    ? "oklch(0.65 0.22 25 / 0.5)"
                    : "oklch(var(--border))",
                  opacity: r.isActive ? 1 : 0.6,
                }}
                data-ocid={`recurring.item.${idx + 1}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: catColor }}
                      />
                      <span className="text-sm font-semibold text-foreground truncate">
                        {r.description || r.subCategory}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                        style={{
                          backgroundColor: `${catColor}22`,
                          color: catColor,
                        }}
                      >
                        {FREQ_LABELS[r.frequency]}
                      </span>
                      {isMissed && (
                        <Badge
                          className="text-[10px] px-1.5 py-0"
                          style={{
                            backgroundColor: "#EB575722",
                            color: "#EB5757",
                          }}
                        >
                          Missed
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.mainCategory}
                      {r.subCategory ? ` \u203a ${r.subCategory}` : ""}
                    </div>
                    {r.account && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Account: {r.account}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Next: {nextDueLabel}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className="text-base font-bold"
                      style={{ color: catColor }}
                    >
                      {formatAmount(r.amount, currency)}
                    </span>
                    <Switch
                      checked={r.isActive}
                      onCheckedChange={(v) =>
                        updateRecurring(r.id, { isActive: v })
                      }
                      data-ocid={`recurring.toggle.${idx + 1}`}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                    style={{
                      backgroundColor: "oklch(var(--secondary))",
                      color: "oklch(var(--foreground))",
                    }}
                    data-ocid={`recurring.edit_button.${idx + 1}`}
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(r.id)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                    style={{ backgroundColor: "#EB575722", color: "#EB5757" }}
                    data-ocid={`recurring.delete_button.${idx + 1}`}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto"
          data-ocid="recurring.form.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Recurring" : "Add Recurring"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="e.g. Monthly Rent"
                className="mt-1"
                data-ocid="recurring.description.input"
              />
            </div>
            <div>
              <Label>Amount ({currency})</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="0.00"
                min="0"
                className="mt-1"
                data-ocid="recurring.amount.input"
              />
            </div>
            <div>
              <Label>Category</Label>
              <select
                className="w-full mt-1 p-2 rounded-lg border border-border bg-card text-foreground text-sm"
                value={form.mainCategory}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    mainCategory: e.target.value,
                    subCategory: "",
                  }))
                }
                data-ocid="recurring.category.select"
              >
                <option value="">Select category</option>
                {customCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {subOptions.length > 0 && (
              <div>
                <Label>Subcategory</Label>
                <select
                  className="w-full mt-1 p-2 rounded-lg border border-border bg-card text-foreground text-sm"
                  value={form.subCategory}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subCategory: e.target.value }))
                  }
                  data-ocid="recurring.subcategory.select"
                >
                  <option value="">None</option>
                  {subOptions.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label>Frequency</Label>
              <select
                className="w-full mt-1 p-2 rounded-lg border border-border bg-card text-foreground text-sm"
                value={form.frequency}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    frequency: e.target.value as RecurringFrequency,
                  }))
                }
                data-ocid="recurring.frequency.select"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
                className="mt-1"
                data-ocid="recurring.start_date.input"
              />
            </div>
            {/* Account selector */}
            <div>
              <Label>
                Account{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (optional — balance will be debited automatically)
                </span>
              </Label>
              <select
                className="w-full mt-1 p-2 rounded-lg border border-border bg-card text-foreground text-sm"
                value={form.account}
                onChange={(e) =>
                  setForm((f) => ({ ...f, account: e.target.value }))
                }
                data-ocid="recurring.account.select"
              >
                <option value="">No account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                data-ocid="recurring.active.switch"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              data-ocid="recurring.form.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              style={{
                backgroundColor: "oklch(var(--primary))",
                color: "oklch(var(--primary-foreground))",
              }}
              data-ocid="recurring.form.submit_button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent data-ocid="recurring.delete.dialog">
          <DialogHeader>
            <DialogTitle>Delete Recurring</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove this recurring transaction rule?
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              data-ocid="recurring.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (deleteId) {
                  deleteRecurring(deleteId);
                  setDeleteId(null);
                  toast.success("Recurring transaction deleted");
                }
              }}
              style={{ backgroundColor: "#EB5757", color: "#fff" }}
              data-ocid="recurring.delete.confirm_button"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
