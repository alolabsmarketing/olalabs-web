import Link from "next/link";
import { Check } from "lucide-react";
import CheckoutButton from "@/components/CheckoutButton";

const PLANS = [
  {
    name: "Free", price: "$0", period: "",
    description: "Start for free, no card needed",
    borderClass: "border-white/10",
    features: [
      "3 sessions per day",
      "5 minutes per session",
      "10 minutes voice practice/day",
      "2 AI characters (Emma & Leo)",
      "3 practice scenarios",
    ],
    ctaType: "link" as const,
    ctaHref: "/register",
    ctaLabel: "Get started",
    ctaClass: "bg-white/10 hover:bg-white/20 text-white",
  },
  {
    name: "Pro", price: "$9", period: "/month",
    description: "For daily learners — 1-2 hours a day",
    borderClass: "border-indigo-500/50",
    badge: "Most Popular",
    features: [
      "10 sessions per day",
      "20 minutes per session",
      "Unlimited voice practice",
      "All 6+ AI characters",
      "All practice scenarios",
      "Session analysis & feedback",
    ],
    ctaType: "checkout" as const,
    ctaPlan: "pro" as const,
    ctaLabel: "Start Pro",
    ctaClass: "bg-indigo-600 hover:bg-indigo-500 text-white",
  },
  {
    name: "Premium", price: "$19", period: "/month",
    description: "For serious learners — no limits",
    borderClass: "border-amber-500/30",
    features: [
      "Unlimited sessions & length",
      "Unlimited voice practice",
      "All characters & scenarios",
      "Detailed analysis & feedback",
      "Progress charts & streaks",
      "Custom scenarios (coming soon)",
    ],
    ctaType: "checkout" as const,
    ctaPlan: "premium" as const,
    ctaLabel: "Start Premium",
    ctaClass: "bg-amber-500 hover:bg-amber-400 text-white",
  },
] as const;

export default function PricingPage() {
  return (
    <div className="ola-gradient-bg relative min-h-screen">
      <div className="ola-wave" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <Link href="/" className="text-white font-bold text-2xl tracking-tight block mb-8">OLA</Link>
          <h1 className="text-4xl font-bold text-white mb-3">Simple pricing</h1>
          <p className="text-white/50">Start free. Upgrade when you're ready.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`relative bg-white/5 border ${plan.borderClass} rounded-2xl p-8`}>
              {"badge" in plan && plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}
              <div className="mb-6">
                <div className="text-white/50 text-sm font-semibold uppercase tracking-wider mb-1">{plan.name}</div>
                <div className="text-4xl font-bold text-white">
                  {plan.price}<span className="text-base font-normal text-white/40">{plan.period}</span>
                </div>
                <div className="text-white/40 text-sm mt-1">{plan.description}</div>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                    <Check size={14} className="text-green-400 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              {plan.ctaType === "link" ? (
                <Link href={plan.ctaHref}
                  className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors ${plan.ctaClass}`}>
                  {plan.ctaLabel}
                </Link>
              ) : (
                <CheckoutButton plan={plan.ctaPlan} label={plan.ctaLabel}
                  className={`w-full py-3 rounded-xl font-semibold text-sm ${plan.ctaClass}`} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
