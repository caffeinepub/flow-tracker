import {
  Clock,
  Eye,
  EyeOff,
  LayoutDashboard,
  Leaf,
  Moon,
  NotebookPen,
  Plus,
  Settings,
  Sun,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";
import type { Tab } from "./BottomNav";

interface AppSidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isDark: boolean;
  onThemeToggle: () => void;
  privacyMode: boolean;
  onPrivacyToggle: () => void;
}

export function AppSidebar({
  activeTab,
  onTabChange,
  isDark,
  onThemeToggle,
  privacyMode,
  onPrivacyToggle,
}: AppSidebarProps) {
  const t = useTranslation();

  const tabs = [
    { id: "dashboard" as Tab, label: t("dashboard"), icon: LayoutDashboard },
    { id: "accounts" as Tab, label: "Accounts", icon: Wallet },
    { id: "add" as Tab, label: t("add"), icon: Plus, isAdd: true },
    { id: "projections" as Tab, label: "Goals", icon: TrendingUp },
    { id: "history" as Tab, label: "History", icon: Clock },
    { id: "notes" as Tab, label: "Notes", icon: NotebookPen },
    { id: "settings" as Tab, label: t("settings"), icon: Settings },
  ];

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-40 w-20 backdrop-blur-md border-r border-border/50"
      style={{ backgroundColor: "oklch(var(--card) / 0.75)" }}
      data-ocid="sidebar.nav"
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-1 px-2 pt-5 pb-4 border-b border-border/30">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, oklch(var(--primary)), oklch(var(--accent)))",
            boxShadow: "0 4px 12px oklch(var(--primary) / 0.35)",
          }}
        >
          <Leaf size={16} className="text-primary-foreground" />
        </div>
        <span
          className="text-[9px] font-bold tracking-wide text-center leading-tight font-display"
          style={{ color: "oklch(var(--foreground))" }}
        >
          Flow
          <br />
          Tracker
        </span>
      </div>

      {/* Nav items */}
      <nav
        className="flex flex-col items-center gap-1 px-2 py-3 flex-1"
        aria-label="Main navigation"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isAdd) {
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center gap-1 w-full py-2.5 px-1 rounded-xl transition-all duration-200 active:scale-95 my-1"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(var(--primary)), oklch(var(--accent)))",
                  boxShadow: "0 4px 12px oklch(var(--primary) / 0.35)",
                }}
                data-ocid="sidebar.add.button"
                aria-label={tab.label}
              >
                <Icon size={18} className="text-primary-foreground" />
                <span className="text-[9px] font-semibold text-primary-foreground leading-none">
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
              className="group relative flex flex-col items-center gap-1 w-full py-2.5 px-1 rounded-xl transition-all duration-200 active:scale-95"
              style={
                isActive
                  ? {
                      backgroundColor: "oklch(var(--primary) / 0.12)",
                      borderLeft: "2px solid oklch(var(--primary))",
                    }
                  : {
                      borderLeft: "2px solid transparent",
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "oklch(var(--primary) / 0.06)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "";
                }
              }}
              data-ocid={`sidebar.${tab.id}.link`}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                size={18}
                style={{
                  color: isActive
                    ? "oklch(var(--primary))"
                    : "oklch(var(--muted-foreground))",
                  transition: "color 0.2s",
                }}
              />
              <span
                className="text-[9px] font-medium leading-none transition-colors duration-200"
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
      </nav>

      {/* Bottom controls: privacy + theme */}
      <div className="flex flex-col items-center gap-2 px-2 py-4 border-t border-border/30">
        <button
          type="button"
          onClick={onPrivacyToggle}
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ backgroundColor: "oklch(var(--secondary))" }}
          aria-label={privacyMode ? "Show amounts" : "Hide amounts"}
          data-ocid="sidebar.privacy_toggle"
        >
          {privacyMode ? (
            <EyeOff size={15} className="text-foreground" />
          ) : (
            <Eye size={15} className="text-foreground" />
          )}
        </button>
        <button
          type="button"
          onClick={onThemeToggle}
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ backgroundColor: "oklch(var(--secondary))" }}
          aria-label="Toggle theme"
          data-ocid="sidebar.theme_toggle"
        >
          {isDark ? (
            <Sun size={15} className="text-foreground" />
          ) : (
            <Moon size={15} className="text-foreground" />
          )}
        </button>
      </div>
    </aside>
  );
}
