export type TranslationKey =
  | "dashboard"
  | "addTransaction"
  | "history"
  | "reports"
  | "settings"
  | "salary"
  | "needs"
  | "wants"
  | "savings"
  | "income"
  | "expense"
  | "remaining"
  | "totalSpent"
  | "budget"
  | "period"
  | "currency"
  | "welcome"
  | "getStarted"
  | "next"
  | "back"
  | "done"
  | "save"
  | "cancel"
  | "delete"
  | "edit"
  | "add"
  | "export"
  | "import"
  | "reset"
  | "amount"
  | "date"
  | "category"
  | "description"
  | "type"
  | "monthly"
  | "biweekly"
  | "weekly"
  | "totalIncome"
  | "totalExpenses"
  | "periodProgress"
  | "categorySpending"
  | "budgetBreakdown"
  | "periodSummary"
  | "startNewPeriod"
  | "resetData"
  | "exportData"
  | "importData"
  | "language"
  | "theme"
  | "darkMode"
  | "lightMode"
  | "name"
  | "profile"
  | "allocation"
  | "periodManagement"
  | "overspendWarning"
  | "confirmDelete"
  | "confirmReset"
  | "confirmNewPeriod"
  | "noTransactions"
  | "filterAll"
  | "searchPlaceholder"
  | "insights"
  | "spendingTrends"
  | "periodComparison"
  | "thisPeriod"
  | "lastPeriod"
  | "vs"
  | "topSpend"
  | "underBudget"
  | "overBudget"
  | "onTrack"
  | "allocationMustSum"
  | "amountRequired"
  | "positiveAmount"
  | "onboarding1Title"
  | "onboarding1Desc"
  | "onboarding2Title"
  | "onboarding2Desc"
  | "onboarding3Title"
  | "onboarding3Desc";

export const translations: Record<string, Record<TranslationKey, string>> = {
  en: {
    dashboard: "Dashboard",
    addTransaction: "Add Transaction",
    history: "History",
    reports: "Reports",
    settings: "Settings",
    salary: "Income",
    needs: "Needs",
    wants: "Wants",
    savings: "Savings",
    income: "Income",
    expense: "Expense",
    remaining: "Remaining",
    totalSpent: "Total Spent",
    budget: "Budget",
    period: "Period",
    currency: "Currency",
    welcome: "Welcome to Flow Tracker",
    getStarted: "Get Started",
    next: "Next",
    back: "Back",
    done: "Done",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    export: "Export",
    import: "Import",
    reset: "Reset",
    amount: "Amount",
    date: "Date",
    category: "Category",
    description: "Description",
    type: "Type",
    monthly: "Monthly",
    biweekly: "Bi-weekly",
    weekly: "Weekly",
    totalIncome: "Total Income",
    totalExpenses: "Total Expenses",
    periodProgress: "Period Progress",
    categorySpending: "Category Spending",
    budgetBreakdown: "Budget Breakdown",
    periodSummary: "Period Summary",
    startNewPeriod: "Start New Period",
    resetData: "Reset All Data",
    exportData: "Export Data",
    importData: "Import Data",
    language: "Language",
    theme: "Theme",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    name: "Name",
    profile: "Profile",
    allocation: "Budget Allocation (%)",
    periodManagement: "Period Management",
    overspendWarning: "This will exceed your budget for this category!",
    confirmDelete: "Are you sure you want to delete this transaction?",
    confirmReset:
      "This will permanently delete ALL your data. This cannot be undone.",
    confirmNewPeriod:
      "Start a new period? Current transactions will be archived.",
    noTransactions: "No transactions yet. Add your first one!",
    filterAll: "All",
    searchPlaceholder: "Search transactions...",
    insights: "Insights",
    spendingTrends: "Spending Trends",
    periodComparison: "Period Comparison",
    thisPeriod: "This Period",
    lastPeriod: "Last Period",
    vs: "vs",
    topSpend: "Top spend",
    underBudget: "under budget",
    overBudget: "over budget",
    onTrack: "on track",
    allocationMustSum: "Allocations must sum to 100%",
    amountRequired: "Amount is required",
    positiveAmount: "Amount must be positive",
    onboarding1Title: "Let's set up your income",
    onboarding1Desc: "Tell us about your income to get started",
    onboarding2Title: "Set your budget allocation",
    onboarding2Desc: "How do you want to split your income?",
    onboarding3Title: "You're all set!",
    onboarding3Desc: "Start tracking your finances with clarity",
  },
  tl: {
    dashboard: "Dashboard",
    addTransaction: "Magdagdag ng Transaksyon",
    history: "Kasaysayan",
    reports: "Ulat",
    settings: "Mga Setting",
    salary: "Kita",
    needs: "Pangangailangan",
    wants: "Kagustuhan",
    savings: "Ipon",
    income: "Kita",
    expense: "Gastos",
    remaining: "Natitira",
    totalSpent: "Kabuuang Gastos",
    budget: "Badyet",
    period: "Panahon",
    currency: "Pera",
    welcome: "Maligayang pagdating sa Flow Tracker",
    getStarted: "Magsimula",
    next: "Susunod",
    back: "Bumalik",
    done: "Tapos",
    save: "I-save",
    cancel: "Kanselahin",
    delete: "Burahin",
    edit: "I-edit",
    add: "Idagdag",
    export: "I-export",
    import: "Mag-import",
    reset: "I-reset",
    amount: "Halaga",
    date: "Petsa",
    category: "Kategorya",
    description: "Paglalarawan",
    type: "Uri",
    monthly: "Buwanang",
    biweekly: "Dalawang Linggo",
    weekly: "Lingguhang",
    totalIncome: "Kabuuang Kita",
    totalExpenses: "Kabuuang Gastos",
    periodProgress: "Progreso ng Panahon",
    categorySpending: "Gastos sa Kategorya",
    budgetBreakdown: "Paghahati ng Badyet",
    periodSummary: "Buod ng Panahon",
    startNewPeriod: "Magsimula ng Bagong Panahon",
    resetData: "I-reset ang Lahat ng Data",
    exportData: "I-export ang Data",
    importData: "Mag-import ng Data",
    language: "Wika",
    theme: "Tema",
    darkMode: "Madilim na Mode",
    lightMode: "Maliwanag na Mode",
    name: "Pangalan",
    profile: "Propilo",
    allocation: "Paglalaan ng Badyet (%)",
    periodManagement: "Pamamahala ng Panahon",
    overspendWarning: "Lalampas ito sa iyong badyet para sa kategoryang ito!",
    confirmDelete: "Sigurado ka bang gusto mong burahin ang transaksyong ito?",
    confirmReset:
      "Permanenteng mabubura ang LAHAT ng iyong data. Hindi ito maaaring ibalik.",
    confirmNewPeriod:
      "Magsimula ng bagong panahon? Ang mga kasalukuyang transaksyon ay ia-archive.",
    noTransactions: "Wala pang transaksyon. Magdagdag ng una!",
    filterAll: "Lahat",
    searchPlaceholder: "Maghanap ng mga transaksyon...",
    insights: "Mga Insight",
    spendingTrends: "Mga Trend sa Paggastos",
    periodComparison: "Paghahambing ng Panahon",
    thisPeriod: "Kasalukuyang Panahon",
    lastPeriod: "Nakaraang Panahon",
    vs: "vs",
    topSpend: "Pinakamataas na gastos",
    underBudget: "kulang sa badyet",
    overBudget: "lampas sa badyet",
    onTrack: "on track",
    allocationMustSum: "Ang kabuuan ng paglalaan ay dapat 100%",
    amountRequired: "Kailangan ang halaga",
    positiveAmount: "Ang halaga ay dapat positibo",
    onboarding1Title: "I-set up ang iyong kita",
    onboarding1Desc: "Sabihin sa amin ang tungkol sa iyong kita para magsimula",
    onboarding2Title: "Itakda ang paglalaan ng badyet",
    onboarding2Desc: "Paano mo gustong hatiin ang iyong kita?",
    onboarding3Title: "Handa ka na!",
    onboarding3Desc: "Simulan ang pag-track ng iyong mga pananalapi",
  },
};
