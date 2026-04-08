import {
  Clock,
  LayoutDashboard,
  NotebookPen,
  Plus,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";

export type Tab =
  | "dashboard"
  | "accounts"
  | "add"
  | "projections"
  | "history"
  | "settings"
  | "notes";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const t = useTranslation();

  const tabs = [
    { id: "dashboard" as Tab, label: t("dashboard"), icon: LayoutDashboard },
    { id: "accounts" as Tab, label: "Accounts", icon: Wallet },
    { id: "add" as Tab, label: t("add"), icon: Plus, isCenter: true },
    { id: "projections" as Tab, label: "Goals", icon: TrendingUp },
    { id: "history" as Tab, label: "History", icon: Clock },
    { id: "notes" as Tab, label: "Notes", icon: NotebookPen },
    { id: "settings" as Tab, label: t("settings"), icon: Settings },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md border-t border-border/50"
      style={{ backgroundColor: "oklch(var(--background) / 0.75)" }}
    >
      <div className="flex items-end justify-around px-0.5 pb-safe max-w-lg mx-auto h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isCenter) {
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center gap-0.5 px-1.5 -translate-y-3 transition-all duration-200"
                data-ocid="nav.add.button"
                aria-label={tab.label}
              >
                <div
                  className="flex items-center justify-center rounded-full p-3 shadow-lg transition-transform duration-200 active:scale-95"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(var(--primary)), oklch(var(--accent)))",
                    boxShadow: "0 4px 16px oklch(var(--primary) / 0.4)",
                  }}
                >
                  <Icon size={20} className="text-primary-foreground" />
                </div>
                <span
                  className="text-[8px] font-medium transition-colors duration-200"
                  style={{
                    color: isActive
                      ? "oklch(var(--primary))"
                      : "oklch(var(--muted-foreground))",
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-0.5 px-1.5 py-2 min-w-[40px] transition-all duration-200 active:scale-95"
              data-ocid={`nav.${tab.id}.link`}
              aria-label={tab.label}
            >
              <div
                className="relative flex items-center justify-center w-8 h-6 rounded-lg transition-all duration-200"
                style={
                  isActive
                    ? { backgroundColor: "oklch(var(--primary) / 0.12)" }
                    : {}
                }
              >
                <Icon
                  size={17}
                  style={{
                    color: isActive
                      ? "oklch(var(--primary))"
                      : "oklch(var(--muted-foreground))",
                  }}
                />
              </div>
              <span
                className="text-[8px] font-medium transition-colors duration-200"
                style={{
                  color: isActive
                    ? "oklch(var(--primary))"
                    : "oklch(var(--muted-foreground))",
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
