import type { CategoriesMap, CustomCategory } from "../types";

export const CATEGORIES: CategoriesMap = {
  Needs: {
    color: "#20D18A",
    subCategories: [
      { name: "Food/Grocery", icon: "ShoppingCart", badgeColor: "#14532d" },
      { name: "Rent", icon: "Home", badgeColor: "#1e3a5f" },
      { name: "Utilities", icon: "Zap", badgeColor: "#713f12" },
      { name: "Transportation", icon: "Car", badgeColor: "#7c2d12" },
      { name: "Bills/Subscriptions", icon: "FileText", badgeColor: "#4c1d95" },
    ],
  },
  Wants: {
    color: "#19B7C6",
    subCategories: [
      { name: "Eating Out", icon: "Utensils", badgeColor: "#831843" },
      { name: "Shopping/Clothes", icon: "Shirt", badgeColor: "#9f1239" },
      { name: "Entertainment", icon: "Tv", badgeColor: "#312e81" },
      { name: "Dates", icon: "Heart", badgeColor: "#7f1d1d" },
      { name: "Hobbies", icon: "Gamepad2", badgeColor: "#164e63" },
    ],
  },
  Savings: {
    color: "#6EE7B7",
    subCategories: [
      { name: "Emergency Fund", icon: "Shield", badgeColor: "#14532d" },
      { name: "Retirement", icon: "TrendingUp", badgeColor: "#134e4a" },
      { name: "Goal-Based Savings", icon: "Target", badgeColor: "#78350f" },
    ],
  },
};

export const DEFAULT_CUSTOM_CATEGORIES: CustomCategory[] = [
  {
    id: "needs",
    name: "Needs",
    color: "#20D18A",
    pct: 50,
    subCategories: [
      { id: "food", name: "Food/Grocery", icon: "ShoppingCart", pct: 20 },
      { id: "rent", name: "Rent", icon: "Home", pct: 20 },
      { id: "utilities", name: "Utilities", icon: "Zap", pct: 20 },
      { id: "transport", name: "Transportation", icon: "Car", pct: 20 },
      { id: "bills", name: "Bills/Subscriptions", icon: "FileText", pct: 20 },
    ],
  },
  {
    id: "wants",
    name: "Wants",
    color: "#19B7C6",
    pct: 30,
    subCategories: [
      { id: "eatout", name: "Eating Out", icon: "Utensils", pct: 20 },
      { id: "shopping", name: "Shopping/Clothes", icon: "Shirt", pct: 20 },
      { id: "entertainment", name: "Entertainment", icon: "Tv", pct: 20 },
      { id: "dates", name: "Dates", icon: "Heart", pct: 20 },
      { id: "hobbies", name: "Hobbies", icon: "Gamepad2", pct: 20 },
    ],
  },
  {
    id: "savings",
    name: "Savings",
    color: "#6EE7B7",
    pct: 20,
    subCategories: [
      { id: "emergency", name: "Emergency Fund", icon: "Shield", pct: 30 },
      { id: "retirement", name: "Retirement", icon: "TrendingUp", pct: 30 },
      {
        id: "goalSavings",
        name: "Goal-Based Savings",
        icon: "Target",
        pct: 30,
      },
      { id: "investments", name: "Investments", icon: "BarChart2", pct: 10 },
    ],
  },
];

export const KEYWORD_MAP: Record<string, string> = {
  jollibee: "Eating Out",
  mcdo: "Eating Out",
  mcdonald: "Eating Out",
  kfc: "Eating Out",
  lunch: "Eating Out",
  dinner: "Eating Out",
  breakfast: "Eating Out",
  kain: "Eating Out",
  restaurant: "Eating Out",
  food: "Food/Grocery",
  grocery: "Food/Grocery",
  palengke: "Food/Grocery",
  market: "Food/Grocery",
  gulay: "Food/Grocery",
  grab: "Transportation",
  uber: "Transportation",
  mrt: "Transportation",
  lrt: "Transportation",
  angkas: "Transportation",
  commute: "Transportation",
  jeep: "Transportation",
  bus: "Transportation",
  gas: "Transportation",
  petron: "Transportation",
  shell: "Transportation",
  netflix: "Entertainment",
  spotify: "Entertainment",
  game: "Entertainment",
  steam: "Entertainment",
  cinema: "Entertainment",
  movie: "Entertainment",
  shopee: "Shopping/Clothes",
  lazada: "Shopping/Clothes",
  clothes: "Shopping/Clothes",
  damit: "Shopping/Clothes",
  shoes: "Shopping/Clothes",
  sapatos: "Shopping/Clothes",
  meralco: "Utilities",
  maynilad: "Utilities",
  kuryente: "Utilities",
  tubig: "Utilities",
  internet: "Bills/Subscriptions",
  rent: "Rent",
  upa: "Rent",
  bahay: "Rent",
  emergency: "Emergency Fund",
  ipon: "Goal-Based Savings",
  savings: "Goal-Based Savings",
  invest: "Investments",
};

export const CURRENCIES = ["PHP", "USD", "EUR", "SGD", "AUD", "JPY", "GBP"];

export function getCurrencyLocale(currency: string): string {
  const map: Record<string, string> = {
    PHP: "en-PH",
    USD: "en-US",
    EUR: "de-DE",
    SGD: "en-SG",
    AUD: "en-AU",
    JPY: "ja-JP",
    GBP: "en-GB",
  };
  return map[currency] ?? "en-PH";
}

export function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(getCurrencyLocale(currency), {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function suggestCategory(description: string): string | null {
  const lower = description.toLowerCase();
  for (const [keyword, category] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) {
      return category;
    }
  }
  return null;
}
