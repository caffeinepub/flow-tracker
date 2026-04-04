import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HelpCircle } from "lucide-react";
import { useState } from "react";
import type { GuideSection } from "../data/userGuide";
import { userGuide } from "../data/userGuide";
import type { Language } from "../types";

const SECTION_TITLES: Record<GuideSection, { en: string; tl: string }> = {
  dashboard: { en: "Dashboard", tl: "Dashboard" },
  addTransaction: { en: "Add Transaction", tl: "Magdagdag ng Transaksyon" },
  history: { en: "History", tl: "Kasaysayan" },
  reports: { en: "Reports", tl: "Ulat" },
  accounts: { en: "Accounts", tl: "Mga Account" },
  billTracker: { en: "Bill Tracker", tl: "Tracker ng mga Bayarin" },
  iou: { en: "IOU / Utang Tracker", tl: "IOU / Tracker ng Utang" },
  projections: { en: "Projections", tl: "Mga Proyeksyon" },
  financialGoals: { en: "Financial Goals", tl: "Mga Layuning Pinansyal" },
  recurring: { en: "Recurring", tl: "Paulit-ulit" },
  settings: { en: "Settings", tl: "Mga Setting" },
};

interface HelpSheetProps {
  section: GuideSection;
  language?: Language;
}

export function HelpSheet({ section, language = "en" }: HelpSheetProps) {
  const [open, setOpen] = useState(false);
  const guide = userGuide[section];
  const title = SECTION_TITLES[section];
  const lang = language === "tl" ? "tl" : "en";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex-shrink-0"
        aria-label={`Help: ${title[lang]}`}
        data-ocid={`${section}.help.button`}
      >
        <HelpCircle size={14} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[70vh]"
          data-ocid={`${section}.help.sheet`}
        >
          <SheetHeader className="mb-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "oklch(var(--primary) / 0.15)" }}
              >
                <HelpCircle
                  size={16}
                  style={{ color: "oklch(var(--primary))" }}
                />
              </div>
              <SheetTitle className="text-left">{title[lang]}</SheetTitle>
            </div>
          </SheetHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {guide[lang]}
          </p>
        </SheetContent>
      </Sheet>
    </>
  );
}
