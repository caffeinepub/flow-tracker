import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Check, ChevronLeft, ChevronRight, Leaf } from "lucide-react";
import { useState } from "react";
import { CURRENCIES } from "../data/categories";
import { useTranslation } from "../hooks/useTranslation";
import type { Config, Language, Period } from "../types";

interface OnboardingProps {
  onComplete: (config: Config) => void;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom" },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const t = useTranslation();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [salary, setSalary] = useState("");
  const [period, setPeriod] = useState<Period>("monthly");
  const [currency, setCurrency] = useState("PHP");
  const [needsPct, setNeedsPct] = useState(50);
  const [wantsPct, setWantsPct] = useState(30);
  const [savingsPct, setSavingsPct] = useState(20);
  const [lang, setLang] = useState<Language>("en");
  const [customEndDate, setCustomEndDate] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");

  const total = needsPct + wantsPct + savingsPct;
  const isValidAllocation = total === 100;

  const handleFinish = () => {
    const resolvedStartDate =
      period === "custom" && customStartDate
        ? customStartDate
        : format(new Date(), "yyyy-MM-dd");
    const config: Config = {
      name: name.trim() || "User",
      salary: Number.parseFloat(salary) || 0,
      period,
      currency,
      needsPct,
      wantsPct,
      savingsPct,
      startDate: resolvedStartDate,
      language: lang,
      theme: "dark",
      ...(period === "custom" && customStartDate ? { customStartDate } : {}),
      ...(period === "custom" && customEndDate ? { customEndDate } : {}),
    };
    onComplete(config);
  };

  const steps = [
    { title: t("onboarding1Title"), desc: t("onboarding1Desc") },
    { title: t("onboarding2Title"), desc: t("onboarding2Desc") },
    { title: t("onboarding3Title"), desc: t("onboarding3Desc") },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gradient-bg">
      <div className="flex items-center gap-2 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "oklch(var(--primary))" }}
        >
          <Leaf size={20} className="text-primary-foreground" />
        </div>
        <span className="text-xl font-bold text-foreground">Flow Tracker</span>
      </div>

      <div className="flex gap-2 mb-8">
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: step >= 0 ? 24 : 8,
            backgroundColor:
              step >= 0 ? "oklch(var(--primary))" : "oklch(var(--muted))",
          }}
        />
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: step >= 1 ? 24 : 8,
            backgroundColor:
              step >= 1 ? "oklch(var(--primary))" : "oklch(var(--muted))",
          }}
        />
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: step >= 2 ? 24 : 8,
            backgroundColor:
              step >= 2 ? "oklch(var(--primary))" : "oklch(var(--muted))",
          }}
        />
      </div>

      <div className="w-full max-w-sm slide-up">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          {steps[step].title}
        </h1>
        <p className="text-muted-foreground mb-6">{steps[step].desc}</p>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maria Santos"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="salary">{t("salary")}</Label>
              <Input
                id="salary"
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="25000"
                className="mt-1"
                min="0"
              />
            </div>
            <div>
              <Label>{t("currency")}</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {CURRENCIES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCurrency(c)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
                    style={{
                      backgroundColor:
                        currency === c
                          ? "oklch(var(--primary))"
                          : "oklch(var(--secondary))",
                      color:
                        currency === c
                          ? "oklch(var(--primary-foreground))"
                          : "oklch(var(--foreground))",
                      borderColor:
                        currency === c
                          ? "oklch(var(--primary))"
                          : "oklch(var(--border))",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>{t("period")}</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {PERIODS.map((p) => (
                  <button
                    type="button"
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium border transition-all min-w-[5rem]"
                    style={{
                      backgroundColor:
                        period === p.value
                          ? "oklch(var(--primary))"
                          : "oklch(var(--secondary))",
                      color:
                        period === p.value
                          ? "oklch(var(--primary-foreground))"
                          : "oklch(var(--foreground))",
                      borderColor:
                        period === p.value
                          ? "oklch(var(--primary))"
                          : "oklch(var(--border))",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {period === "custom" && (
                <div className="mt-2 space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Start Date
                    </Label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      End Date
                    </Label>
                    <input
                      type="date"
                      value={customEndDate}
                      min={customStartDate || undefined}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
            </div>
            <div>
              <Label>{t("language")}</Label>
              <div className="flex gap-2 mt-1">
                {(["en", "tl"] as Language[]).map((l) => (
                  <button
                    type="button"
                    key={l}
                    onClick={() => setLang(l)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium border transition-all"
                    style={{
                      backgroundColor:
                        lang === l
                          ? "oklch(var(--primary))"
                          : "oklch(var(--secondary))",
                      color:
                        lang === l
                          ? "oklch(var(--primary-foreground))"
                          : "oklch(var(--foreground))",
                      borderColor:
                        lang === l
                          ? "oklch(var(--primary))"
                          : "oklch(var(--border))",
                    }}
                  >
                    {l === "en" ? "English" : "Tagalog"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <p className="text-xs text-muted-foreground">
              Enter your preferred budget allocation. All three must add up to
              exactly 100%.
            </p>

            {[
              {
                label: t("needs"),
                value: needsPct,
                color: "#20D18A",
                key: "needs" as const,
                setter: setNeedsPct,
              },
              {
                label: t("wants"),
                value: wantsPct,
                color: "#19B7C6",
                key: "wants" as const,
                setter: setWantsPct,
              },
              {
                label: t("savings"),
                value: savingsPct,
                color: "#6EE7B7",
                key: "savings" as const,
                setter: setSavingsPct,
              },
            ].map((item) => (
              <div key={item.key}>
                <div className="flex justify-between items-center mb-1.5">
                  <Label style={{ color: item.color }}>{item.label}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={item.value}
                    onChange={(e) => {
                      const v = Math.max(
                        0,
                        Math.min(100, Number(e.target.value) || 0),
                      );
                      item.setter(v);
                    }}
                    className="w-20 text-center font-bold"
                    style={{ borderColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: "oklch(var(--muted))" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.value}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            <div
              className="p-3 rounded-lg text-sm text-center font-medium"
              style={{
                backgroundColor: isValidAllocation
                  ? "oklch(var(--primary) / 0.15)"
                  : "oklch(var(--destructive) / 0.15)",
                color: isValidAllocation
                  ? "oklch(var(--primary))"
                  : "oklch(var(--destructive))",
              }}
            >
              Total: {total}%
              {isValidAllocation
                ? " ✓ Perfect!"
                : total > 100
                  ? " — reduce to 100"
                  : ` — add ${100 - total}% more`}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {[
              { label: t("name"), value: name || "User" },
              {
                label: t("salary"),
                value: `${currency} ${Number.parseFloat(salary || "0").toLocaleString()}`,
              },
              {
                label: t("period"),
                value: PERIODS.find((p) => p.value === period)?.label ?? period,
              },
              ...(period === "custom"
                ? [
                    {
                      label: "Start Date",
                      value: customStartDate || "Not set",
                    },
                    { label: "End Date", value: customEndDate || "Not set" },
                  ]
                : []),
              { label: t("needs"), value: `${needsPct}%` },
              { label: t("wants"), value: `${wantsPct}%` },
              { label: t("savings"), value: `${savingsPct}%` },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between items-center py-2 border-b border-border"
              >
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-semibold text-foreground">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              className="flex-1"
            >
              <ChevronLeft size={16} className="mr-1" />
              {t("back")}
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !isValidAllocation}
              className="flex-1"
              style={{
                backgroundColor: "oklch(var(--primary))",
                color: "oklch(var(--primary-foreground))",
              }}
            >
              {t("next")}
              <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              className="flex-1"
              style={{
                backgroundColor: "oklch(var(--primary))",
                color: "oklch(var(--primary-foreground))",
              }}
            >
              <Check size={16} className="mr-1" />
              {t("getStarted")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
