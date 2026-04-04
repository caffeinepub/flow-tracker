export type GuideSection =
  | "dashboard"
  | "addTransaction"
  | "history"
  | "reports"
  | "accounts"
  | "billTracker"
  | "iou"
  | "projections"
  | "financialGoals"
  | "recurring"
  | "settings";

export const userGuide: Record<GuideSection, { en: string; tl: string }> = {
  dashboard: {
    en: "The Dashboard shows your budget summary for the current period. You can see how much you've spent, how much is left, and your progress toward financial goals. Tap any section to expand or collapse it.",
    tl: "Ang Dashboard ay nagpapakita ng buod ng iyong badyet para sa kasalukuyang panahon. Makikita mo kung magkano na ang nagastos mo, magkano pa ang natitira, at kung gaano na ang iyong progreso sa mga layuning pinansyal. I-tap ang anumang seksyon para palawakin o i-collapse ito.",
  },
  addTransaction: {
    en: "Use this to record money you received (Income), money you spent (Expense), money moved between accounts (Transfer), or savings contributed to a goal (Save to Goal). Fill in the amount, category, and account, then tap Save.",
    tl: "Gamitin ito para i-record ang perang natanggap mo (Kita), perang nagastos mo (Gastos), perang inilipat sa pagitan ng mga account (Transfer), o ipon na inilagay sa isang layunin (Save to Goal). Punan ang halaga, kategorya, at account, tapos i-tap ang Save.",
  },
  history: {
    en: "History shows all your transactions from the beginning. You can search, filter by type or category, edit or delete any transaction, and export everything as a CSV file.",
    tl: "Ang History ay nagpapakita ng lahat ng iyong mga transaksyon mula sa simula. Maaari kang maghanap, mag-filter ayon sa uri o kategorya, mag-edit o mag-delete ng anumang transaksyon, at i-export ang lahat bilang CSV file.",
  },
  reports: {
    en: "Reports shows charts and year-to-date summaries for all your spending categories. Tap a category to see a breakdown by subcategory. Use the month and year filters to view past periods.",
    tl: "Ang Reports ay nagpapakita ng mga chart at buod ng taon para sa lahat ng iyong mga kategorya ng gastos. I-tap ang isang kategorya para makita ang breakdown ayon sa sub-kategorya. Gamitin ang mga filter ng buwan at taon para tingnan ang mga nakaraang panahon.",
  },
  accounts: {
    en: "Accounts shows all your money — bank accounts, e-wallets, and cash. Your net worth is calculated automatically. Tap any account to see its transaction history. You can add, edit, rename, or delete accounts anytime.",
    tl: "Ang Accounts ay nagpapakita ng lahat ng iyong pera — mga bank account, e-wallet, at cash. Awtomatikong kinakalkula ang iyong net worth. I-tap ang anumang account para makita ang kasaysayan ng transaksyon nito. Maaari kang magdagdag, mag-edit, mag-rename, o mag-delete ng mga account anumang oras.",
  },
  billTracker: {
    en: "Bill Tracker helps you remember which bills are due each month and mark them as paid. Add your regular bills with their due dates. You will see a reminder when a bill is due within 3 days.",
    tl: "Ang Bill Tracker ay tumutulong sa iyo na matandaan kung aling mga bayarin ang dapat bayaran bawat buwan at markahan ang mga ito bilang nabayaran. Idagdag ang iyong mga regular na bayarin kasama ang kanilang mga petsa ng pagbabayad. Makakakita ka ng paalala kapag ang isang bayarin ay dapat bayaran sa loob ng 3 araw.",
  },
  iou: {
    en: "IOU Tracker records money you lent to others or borrowed from others. Track repayments, set reminders, and see how IOUs affect your net worth. Lent money increases your assets; borrowed money increases your liabilities.",
    tl: "Ang IOU Tracker ay nagtatala ng perang ipinautang mo sa iba o hiniram mo mula sa iba. I-track ang mga pagbabayad, magtakda ng mga paalala, at tingnan kung paano nakakaapekto ang mga IOU sa iyong net worth. Ang perang ipinautang ay nagpapataas ng iyong mga asset; ang perang hiniram ay nagpapataas ng iyong mga pananagutan.",
  },
  projections: {
    en: "Projections shows how your savings and investments could grow over time. Use the sliders to test different income and return rate scenarios. The chart shows your projected growth month by month.",
    tl: "Ang Projections ay nagpapakita kung paano maaaring lumaki ang iyong ipon at mga investment sa paglipas ng panahon. Gamitin ang mga slider para subukan ang iba't ibang sitwasyon ng kita at rate ng kita. Ang chart ay nagpapakita ng iyong inaasahang paglago buwan-buwan.",
  },
  financialGoals: {
    en: "Financial Goals lets you set savings targets — like an emergency fund or a vacation budget. Track your progress, add amounts you have already saved, and see how long it will take to reach each goal.",
    tl: "Ang Financial Goals ay nagbibigay-daan sa iyo na magtakda ng mga target sa ipon — tulad ng emergency fund o badyet sa bakasyon. I-track ang iyong progreso, magdagdag ng mga halagang naipon mo na, at tingnan kung gaano katagal bago maabot ang bawat layunin.",
  },
  recurring: {
    en: "Recurring lets you set up transactions that happen automatically on a schedule — like weekly bills or monthly subscriptions. The app will generate these transactions for you so you do not have to enter them manually each time.",
    tl: "Ang Recurring ay nagbibigay-daan sa iyo na mag-set up ng mga transaksyon na awtomatikong nangyayari sa isang iskedyul — tulad ng mga lingguhang bayarin o buwanang subscription. Ang app ay lilikha ng mga transaksyong ito para sa iyo para hindi mo na kailangang ipasok ang mga ito nang manu-mano sa bawat oras.",
  },
  settings: {
    en: "Settings is where you customize everything — your name, currency, categories, subcategories, accounts, period dates, theme, and language. You can also back up your data or reset the app here.",
    tl: "Ang Settings ay kung saan mo ini-customize ang lahat — ang iyong pangalan, currency, mga kategorya, sub-kategorya, account, mga petsa ng panahon, tema, at wika. Maaari ka ring mag-backup ng iyong data o i-reset ang app dito.",
  },
};
