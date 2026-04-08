export type Period = "monthly" | "biweekly" | "weekly" | "custom";
export type TransactionType = "expense" | "income";
export type Language = "en" | "tl";
export type Theme = "dark" | "light";
export type MainCategory = string; // now dynamic, kept as alias for compat
export type RecurringFrequency = "weekly" | "biweekly" | "monthly";
export type AccountType = "cash" | "bank" | "ewallet" | "credit";

export interface CustomSubCategory {
  id: string;
  name: string;
  icon: string;
  color?: string; // if undefined, inherits parent category color
  pct?: number; // % of parent category budget. If undefined, treat as 0 for display.
  amountValue?: number; // exact peso amount (source of truth in ₱ mode, avoids % round-trip)
}

export interface CustomCategory {
  id: string;
  name: string;
  color: string;
  pct: number;
  subCategories: CustomSubCategory[];
  allocationMode?: "pct" | "amount"; // new: toggle between % and exact amount
  allocationAmount?: number; // new: exact amount in currency when mode is "amount"
}

export interface SubAccount {
  id: string;
  name: string;
  balance: number;
  openingBalance?: number;
  openingDate?: string; // ISO date string
  color?: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  creditLimit?: number; // for credit type
  apr?: number; // annual % rate, for credit type
  dueDate?: string; // ISO date string, monthly due date for CC
  color?: string;
  subAccounts?: SubAccount[];
}

export interface Goal {
  id: string;
  subCategoryId: string;
  subCategoryName: string;
  targetAmount: number;
  label: string;
  currentSaved?: number; // optional baseline: how much is already saved
  alreadySavedAccountId?: string; // which account the already-saved amount came from
  alreadySavedAmount?: number; // the amount that was credited to the account (for delta calc on edit)
  startDate?: string; // ISO date string — when the user started saving / contribution date
}

export interface ProjectionSettings {
  monthlyIncome: number;
  returnRatePct: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Note {
  id: string;
  title?: string;
  body?: string;
  checklist?: ChecklistItem[];
  colorTag?: string; // hex color
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface NextPeriodDraft {
  startDate: string;
  endDate: string;
  expectedIncome: number;
  customCategories?: CustomCategory[];
  createdAt: string;
}

export interface Config {
  name: string;
  salary: number;
  period: Period;
  currency: string;
  customEndDate?: string; // for "custom" period type
  customStartDate?: string; // for "custom" period type — overrides startDate
  // Legacy fields kept for migration
  needsPct?: number;
  wantsPct?: number;
  savingsPct?: number;
  // New dynamic categories
  customCategories?: CustomCategory[];
  startDate: string;
  language: Language;
  theme: Theme;
  // Income source chips
  incomeSourceChips?: string[];
  // Period mode: 'period' = custom dates, 'monthly' = calendar month
  periodMode?: "period" | "monthly";
}

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  mainCategory: string;
  subCategory: string;
  description: string;
  type: TransactionType;
  account?: string; // optional — which account this transaction belongs to
  isOpeningBalance?: boolean; // true for sub-account opening balance transactions
  linkedIOUId?: string; // id of linked IOU (for split expenses)
  iouShare?: number; // the other person's share amount (stored for reliable balance reversal even if IOU is deleted)
  goalId?: string; // id of linked financial goal (for Save to Goal transactions)
}

export interface SalaryPeriod {
  id: string;
  startDate: string;
  endDate: string;
  salary: number;
  needsPct?: number;
  wantsPct?: number;
  savingsPct?: number;
  transactions: Transaction[];
}

export interface SubCategoryConfig {
  name: string;
  icon: string;
  badgeColor: string;
}

export interface CategoryConfig {
  color: string;
  subCategories: SubCategoryConfig[];
}

export type CategoriesMap = Record<string, CategoryConfig>;

export interface RecurringTransaction {
  id: string;
  amount: number;
  mainCategory: string;
  subCategory: string;
  description: string;
  frequency: RecurringFrequency;
  startDate: string;
  isActive: boolean;
  lastGenerated: string | null;
  account?: string; // optional — which account to debit when auto-generated
}

export interface CCAlert {
  accountId: string;
  accountName: string;
  type: "utilization" | "due_soon";
  message: string;
}

export interface IOUEvent {
  id: string;
  date: string; // ISO date string
  type: "lend" | "repay" | "forgiven" | "paid" | "borrow";
  amount: number;
  accountId?: string; // which account was used for repayment
  note?: string;
}

export interface IOU {
  id: string;
  personName: string;
  amountLent: number;
  dateLent: string; // ISO date string
  dueDate: string; // ISO date string
  interestPct?: number; // optional, for display only
  status: "current" | "overdue" | "paid" | "forgiven";
  events: IOUEvent[];
  direction?: "lent" | "borrowed"; // optional for backward compat; undefined = lent
  linkedTransactionId?: string; // id of linked split expense transaction
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDayOfMonth: number; // 1-31
  isPaidThisPeriod: boolean;
  notes?: string;
}
