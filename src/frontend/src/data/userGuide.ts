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
    en: "The Dashboard shows your budget summary for the current period. You can see how much you've spent, how much is left, and your progress toward financial goals. Tap any section to expand or collapse it. Privacy Mode (eye icon in the header) hides all amounts from view.",
    tl: "Ang Dashboard ay nagpapakita ng buod ng iyong badyet para sa kasalukuyang panahon. Makikita mo kung magkano na ang nagastos mo, magkano pa ang natitira, at kung gaano na ang iyong progreso sa mga layuning pinansyal. I-tap ang anumang seksyon para palawakin o i-collapse ito. Ang Privacy Mode (eye icon sa header) ay nagtatago ng lahat ng halaga.",
  },
  addTransaction: {
    en: "Use this to record money you received (Income), money you spent (Expense), money moved between accounts (Transfer), or savings contributed to a goal (Save to Goal). Tap the amount field to use the built-in calculator. For shared bills, enable 'Split with someone' to log only your share and automatically create an IOU for the other person. Tap the camera icon to scan a receipt — you can take a new photo or choose an existing photo from your gallery. The form will be pre-filled with the amount, date, and merchant name for you to review before saving.",
    tl: "Gamitin ito para i-record ang perang natanggap mo (Kita), perang nagastos mo (Gastos), perang inilipat sa pagitan ng mga account (Transfer), o ipon na inilagay sa isang layunin (Save to Goal). I-tap ang field ng halaga para gamitin ang built-in na calculator. Para sa mga shared na bayarin, i-enable ang 'Split with someone' para i-log lamang ang iyong bahagi at awtomatikong lumikha ng IOU para sa kabilang tao. I-tap ang camera icon para i-scan ang resibo — maaari kang kumuha ng bagong larawan o pumili ng mayroon nang larawan mula sa iyong gallery. Ang form ay ma-pre-fill ng halaga, petsa, at pangalan ng merchant para suriin mo bago i-save.",
  },
  history: {
    en: "History shows all your transactions from the beginning. You can search, filter by type or category, edit or delete any transaction, and export everything as a CSV file. Editing a split expense here will automatically update the linked IOU to keep the total in sync.",
    tl: "Ang History ay nagpapakita ng lahat ng iyong mga transaksyon mula sa simula. Maaari kang maghanap, mag-filter ayon sa uri o kategorya, mag-edit o mag-delete ng anumang transaksyon, at i-export ang lahat bilang CSV file. Ang pag-edit ng isang split expense dito ay awtomatikong mag-a-update ng naka-link na IOU para mapanatiling tama ang kabuuan.",
  },
  reports: {
    en: "Reports shows charts and year-to-date summaries for all your spending categories. Tap a category to see a breakdown by subcategory. Use the month and year filters to view past periods. Opening balances are excluded from income totals.",
    tl: "Ang Reports ay nagpapakita ng mga chart at buod ng taon para sa lahat ng iyong mga kategorya ng gastos. I-tap ang isang kategorya para makita ang breakdown ayon sa sub-kategorya. Gamitin ang mga filter ng buwan at taon para tingnan ang mga nakaraang panahon. Ang mga opening balance ay hindi kasama sa mga kabuuang kita.",
  },
  accounts: {
    en: "Accounts shows all your money — bank accounts, e-wallets, and cash. Your net worth is calculated automatically. Tap any account to see its transaction history, which you can edit or delete directly. You can add sub-accounts under any account for more detail. Sub-account balances roll up to the parent account total.",
    tl: "Ang Accounts ay nagpapakita ng lahat ng iyong pera — mga bank account, e-wallet, at cash. Awtomatikong kinakalkula ang iyong net worth. I-tap ang anumang account para makita ang kasaysayan ng transaksyon nito, na maaari mong i-edit o i-delete nang direkta. Maaari kang magdagdag ng mga sub-account sa ilalim ng anumang account para sa mas detalyadong pagsubaybay.",
  },
  billTracker: {
    en: "Bill Tracker helps you remember which bills are due each month and mark them as paid. Add your regular bills with their due dates. You will see a reminder when a bill is due within 3 days. Bill Tracker is best for bills with variable amounts — for fixed monthly bills, consider using Recurring instead.",
    tl: "Ang Bill Tracker ay tumutulong sa iyo na matandaan kung aling mga bayarin ang dapat bayaran bawat buwan at markahan ang mga ito bilang nabayaran. Idagdag ang iyong mga regular na bayarin kasama ang kanilang mga petsa ng pagbabayad. Makakakita ka ng paalala kapag ang isang bayarin ay dapat bayaran sa loob ng 3 araw. Ang Bill Tracker ay pinakamainam para sa mga bayarang nagbabago ang halaga — para sa mga fixed na buwanang bayarin, gamitin ang Recurring.",
  },
  iou: {
    en: "IOU Tracker records money you lent to others or borrowed from others. Track repayments, set reminders, and see how IOUs affect your net worth. You can edit the IOU amount and due date at any time — editing the amount automatically recalculates your share of any linked split expense. Deleting an IOU also removes the linked split expense and reverses the account balance.",
    tl: "Ang IOU Tracker ay nagtatala ng perang ipinautang mo sa iba o hiniram mo mula sa iba. I-track ang mga pagbabayad, magtakda ng mga paalala, at tingnan kung paano nakakaapekto ang mga IOU sa iyong net worth. Maaari mong i-edit ang halaga at petsa ng bayad ng IOU anumang oras — ang pag-edit ng halaga ay awtomatikong kinakalkula ang iyong bahagi ng anumang naka-link na split expense.",
  },
  projections: {
    en: "Projections shows how your savings and investments could grow over time. Set your base monthly income in Projection Settings. Use the Scenario Sliders to temporarily test different income or return rate scenarios — these changes are not saved and reset when you leave. The Subcategory Breakdown shows how each savings category grows month by month based on your current allocations. All calculations are done locally in your browser.",
    tl: "Ang Projections ay nagpapakita kung paano maaaring lumaki ang iyong ipon at mga investment sa paglipas ng panahon. Itakda ang iyong base monthly income sa Projection Settings. Gamitin ang Scenario Sliders para pansamantalang subukan ang iba't ibang sitwasyon ng kita o rate ng kita — ang mga pagbabagong ito ay hindi nase-save at nire-reset kapag umalis ka. Lahat ng kalkulasyon ay ginagawa nang lokal sa iyong browser.",
  },
  financialGoals: {
    en: "Financial Goals lets you set savings targets — like an emergency fund or a vacation budget. Track your progress, add amounts you have already saved, and see how long it will take to reach each goal. Goals are linked to your Projections chart so you can see your projected progress over time.",
    tl: "Ang Financial Goals ay nagbibigay-daan sa iyo na magtakda ng mga target sa ipon — tulad ng emergency fund o badyet sa bakasyon. I-track ang iyong progreso, magdagdag ng mga halagang naipon mo na, at tingnan kung gaano katagal bago maabot ang bawat layunin.",
  },
  recurring: {
    en: "Recurring lets you set up transactions that happen automatically on a schedule — like weekly bills or monthly subscriptions. The app will generate these transactions for you so you do not have to enter them manually each time. The next due date shown is the actual start date if the recurring has never run before.",
    tl: "Ang Recurring ay nagbibigay-daan sa iyo na mag-set up ng mga transaksyon na awtomatikong nangyayari sa isang iskedyul — tulad ng mga lingguhang bayarin o buwanang subscription. Ang app ay lilikha ng mga transaksyong ito para sa iyo. Ang susunod na petsa na ipinapakita ay ang aktwal na start date kung hindi pa nailunsad ang recurring.",
  },
  settings: {
    en: "Settings is where you customize everything — your name, currency, categories, subcategories, accounts, period dates, theme, and language. You can also back up your data (Export Backup) and restore it later (Import Backup). Enable PIN Lock for security — export your backup first, as forgetting the PIN requires a full data wipe. Use 'Check for Updates' to get the latest version of the app.",
    tl: "Ang Settings ay kung saan mo ini-customize ang lahat — ang iyong pangalan, currency, mga kategorya, sub-kategorya, account, mga petsa ng panahon, tema, at wika. Maaari ka ring mag-backup ng iyong data (Export Backup) at i-restore ito mamaya (Import Backup). I-enable ang PIN Lock para sa seguridad — mag-export muna ng backup, dahil ang pagkalimot ng PIN ay nangangailangan ng kumpletong pag-wipe ng data. Gamitin ang 'Check for Updates' para makuha ang pinakabagong bersyon ng app.",
  },
};
