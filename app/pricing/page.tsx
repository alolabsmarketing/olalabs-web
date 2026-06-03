import Link from "next/link";
import { Check } from "lucide-react";
import CheckoutButton from "@/components/CheckoutButton";

const PLANS = [
  {
    name: "Free", price: "$0", salePrice: null, period: "",
    description: "Start for free, no card needed",
    bgClass: "bg-white/[0.03]",
    borderClass: "border-white/[0.08]",
    checkClass: "text-white/30",
    features: [
      "3 sessions per day",
      "5 minutes per session",
      "10 minutes voice / day",
      "2 characters — Ethan & Noah",
      "All practice scenarios",
    ],
    ctaType: "link" as const,
    ctaHref: "/register",
    ctaLabel: "Get started",
    ctaClass: "bg-white/10 hover:bg-white/20 text-white",
  },
  {
    name: "Pro", price: "$9", salePrice: "$4.50", period: "/month",
    description: "For daily learners — 1-2 hours a day",
    bgClass: "bg-white/[0.06]",
    borderClass: "border-white/[0.15]",
    checkClass: "text-blue-400",
    badge: "Most Popular",
    features: [
      "10 sessions per day",
      "20 minutes per session",
      "Unlimited voice practice",
      "All 6 AI characters",
      "Session analysis & feedback",
      "All practice scenarios",
    ],
    ctaType: "checkout" as const,
    ctaPlan: "pro" as const,
    ctaLabel: "Start Pro",
    ctaClass: "bg-indigo-600 hover:bg-indigo-500 text-white",
  },
  {
    name: "Premium", price: "$19", salePrice: "$9.50", period: "/month",
    description: "For serious learners — no limits",
    bgClass: "bg-white/[0.04]",
    borderClass: "border-amber-500/20",
    checkClass: "text-amber-400",
    features: [
      "Unlimited sessions & time",
      "Unlimited voice practice",
      "All 6 AI characters",
      "Session analysis & feedback",
      "Progress charts & streaks",
      "Priority support",
    ],
    ctaType: "checkout" as const,
    ctaPlan: "premium" as const,
    ctaLabel: "Start Premium",
    ctaClass: "bg-amber-500 hover:bg-amber-400 text-white",
  },
] as const;

export default function PricingPage() {
  return (
    <div className="bg-[#080808] min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 h-14 border-b border-white/[0.06] bg-[#080808]/95 backdrop-blur-md">
        <Link href="/" className="text-white font-bold text-xl tracking-tight">olalabs</Link>
        <Link href="/dashboard" className="text-white/50 hover:text-white text-sm transition-colors">Dashboard</Link>
      </header>
      <div className="max-w-5xl mx-auto px-6 py-16 pt-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Simple pricing</h1>
          <p className="text-white/50">
            <span className="text-[#f5c518] font-semibold">50% off</span> — limited time offer. Start free, upgrade when you&apos;re ready.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const showSale = plan.salePrice !== null;
            return (
              <div key={plan.name} className={`relative ${plan.bgClass} border ${plan.borderClass} rounded-2xl p-8`}>
                {"badge" in plan && plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <div className="text-white/50 text-sm font-semibold uppercase tracking-wider mb-1">{plan.name}</div>
                  {showSale ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-white">{plan.salePrice}</span>
                      <span className="text-base font-normal text-white/40 line-through">{plan.price}</span>
                      <span className="text-base font-normal text-white/40">{plan.period}</span>
                    </div>
                  ) : (
                    <div className="text-4xl font-bold text-white">
                      {plan.price}<span className="text-base font-normal text-white/40">{plan.period}</span>
                    </div>
                  )}
                  {showSale && (
                    <div className="mt-1 inline-flex items-center gap-1 bg-[#f5c518]/10 border border-[#f5c518]/20 text-[#f5c518] text-xs font-semibold px-2 py-0.5 rounded-full">
                      50% off — limited offer
                    </div>
                  )}
                  <div className="text-white/40 text-sm mt-1">{plan.description}</div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                      <Check size={14} className={`${plan.checkClass} flex-shrink-0`} />{f}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
