import {
  Clock,
  LayoutDashboard,
  PlusCircle,
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
  | "settings";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const t = useTranslation();

  const tabs = [
    { id: "dashboard" as Tab, label: t("dashboard"), icon: LayoutDashboard },
    { id: "accounts" as Tab, label: "Accounts", icon: Wallet },
    { id: "add" as Tab, label: t("add"), icon: PlusCircle, isCenter: true },
    { id: "projections" as Tab, label: "Projections", icon: TrendingUp },
    { id: "history" as Tab, label: "History", icon: Clock },
    { id: "settings" as Tab, label: t("settings"), icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-around px-1 py-1 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          if (tab.isCenter) {
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center gap-0.5 px-2 py-2 -mt-3"
                data-ocid="nav.add.button"
              >
                <div
                  className="flex items-center justify-center rounded-full p-2.5 shadow-lg"
                  style={{ backgroundColor: "oklch(var(--primary))" }}
                >
                  <Icon size={20} className="text-primary-foreground" />
                </div>
                <span
                  className="text-[9px] font-medium"
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
              className="flex flex-col items-center gap-0.5 px-2 py-2 min-w-[44px]"
              data-ocid={`nav.${tab.id}.link`}
            >
              <Icon
                size={18}
                style={{
                  color: isActive
                    ? "oklch(var(--primary))"
                    : "oklch(var(--muted-foreground))",
                }}
              />
              <span
                className="text-[9px] font-medium"
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
