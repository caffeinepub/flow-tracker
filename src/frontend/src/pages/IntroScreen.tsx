import { Button } from "@/components/ui/button";
import { Leaf, Target, TrendingUp, Wallet } from "lucide-react";
import { motion } from "motion/react";

interface IntroScreenProps {
  language: "en" | "tl";
  onGetStarted: () => void;
}

const content = {
  en: {
    tagline: "Your personal money companion",
    q1: "Where did my money go?",
    q2: "How much do I have left?",
    q3: "When will I reach my goal?",
    body: "Flow Tracker helps you answer these questions every day.",
    f1: "Log income and expenses in seconds",
    f2: "See exactly where your money goes",
    f3: "Track savings goals and stay on target",
    offline: "Works offline. No account needed. Your data stays on your phone.",
    cta: "Get Started",
  },
  tl: {
    tagline: "Ang iyong personal na money tracker",
    q1: "Saan napunta ang pera ko?",
    q2: "Magkano pa ang natitira?",
    q3: "Kailan ko maaabot ang goal ko?",
    body: "Tinutulungan ka ng Flow Tracker na sagutin ang mga tanong na ito araw-araw.",
    f1: "I-log ang kita at gastos sa ilang segundo",
    f2: "Makita kung saan napupunta ang iyong pera",
    f3: "Subaybayan ang savings goals at manatiling on track",
    offline:
      "Gumagana offline. Hindi kailangan ng account. Nananatili ang iyong data sa iyong telepono.",
    cta: "Magsimula",
  },
};

export function IntroScreen({ language, onGetStarted }: IntroScreenProps) {
  const c = content[language] ?? content.en;

  const questions = [c.q1, c.q2, c.q3];
  const features = [
    { icon: Wallet, text: c.f1 },
    { icon: TrendingUp, text: c.f2 },
    { icon: Target, text: c.f3 },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 gradient-bg overflow-y-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center pt-10 mb-6"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
          style={{ backgroundColor: "oklch(var(--primary))" }}
        >
          <Leaf size={32} className="text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-foreground text-center">
          Flow Tracker
        </h1>
        <p className="text-muted-foreground text-center mt-1 text-sm">
          {c.tagline}
        </p>
      </motion.div>

      {/* Three questions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="w-full max-w-sm space-y-2 mb-6"
      >
        {questions.map((q, i) => (
          <motion.div
            key={q}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.25 + i * 0.1 }}
            className="p-3 rounded-xl border"
            style={{
              backgroundColor: "oklch(var(--primary) / 0.1)",
              borderColor: "oklch(var(--primary) / 0.3)",
            }}
          >
            <p
              className="font-semibold text-sm"
              style={{ color: "oklch(var(--primary))" }}
            >
              {q}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Body */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.55 }}
        className="text-sm text-muted-foreground text-center max-w-xs mb-6"
      >
        {c.body}
      </motion.p>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.65 }}
        className="w-full max-w-sm space-y-2 mb-6"
      >
        {features.map(({ icon: Icon, text }, i) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
            className="flex items-center gap-3 p-2.5 rounded-xl"
            style={{ backgroundColor: "oklch(var(--card))" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "oklch(var(--primary) / 0.15)" }}
            >
              <Icon size={16} style={{ color: "oklch(var(--primary))" }} />
            </div>
            <p className="text-sm text-foreground">{text}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Offline note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.0 }}
        className="text-xs text-muted-foreground text-center max-w-xs mb-6"
      >
        {c.offline}
      </motion.p>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.1 }}
        className="w-full max-w-sm pb-6"
      >
        <Button
          onClick={onGetStarted}
          className="w-full h-12 text-base font-semibold rounded-2xl"
          style={{
            backgroundColor: "oklch(var(--primary))",
            color: "oklch(var(--primary-foreground))",
          }}
          data-ocid="intro.primary_button"
        >
          {c.cta}
        </Button>
      </motion.div>
    </div>
  );
}
