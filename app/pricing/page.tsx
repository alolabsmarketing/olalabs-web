import Link from "next/link";
import { Check } from "lucide-react";
import CheckoutButton from "@/components/CheckoutButton";
import { getServerLocale } from "@/lib/locale-server";
import { translations } from "@/lib/i18n";

const PLAN_META = [
  {
    id: "free" as const,
    price: "$0",
    salePrice: null,
    period: "",
    bgClass: "bg-white/[0.03]",
    borderClass: "border-white/[0.08]",
    checkClass: "text-white/30",
    ctaType: "link" as const,
    ctaHref: "/register",
    ctaClass: "bg-white/10 hover:bg-white/20 text-white",
  },
  {
    id: "pro" as const,
    price: "$9",
    salePrice: "$4.50",
    period: "/month",
    bgClass: "bg-white/[0.06]",
    borderClass: "border-white/[0.15]",
    checkClass: "text-blue-400",
    ctaType: "checkout" as const,
    ctaPlan: "pro" as const,
    ctaClass: "bg-indigo-600 hover:bg-indigo-500 text-white",
  },
  {
    id: "premium" as const,
    price: "$19",
    salePrice: "$9.50",
    period: "/month",
    bgClass: "bg-white/[0.04]",
    borderClass: "border-amber-500/20",
    checkClass: "text-amber-400",
    ctaType: "checkout" as const,
    ctaPlan: "premium" as const,
    ctaClass: "bg-amber-500 hover:bg-amber-400 text-white",
  },
] as const;

export default async function PricingPage() {
  const lang = await getServerLocale();
  const T = translations[lang].pricing;

  return (
    <div className="bg-[#080808] min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 h-14 border-b border-white/[0.06] bg-[#080808]/95 backdrop-blur-md">
        <Link href="/" className="text-white font-bold text-xl tracking-tight">olalabs</Link>
        <Link href="/dashboard" className="text-white/50 hover:text-white text-sm transition-colors">{T.dashboard}</Link>
      </header>
      <div className="max-w-5xl mx-auto px-6 py-16 pt-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">{T.heading}</h1>
          <p className="text-white/50">
            <span className="text-[#f5c518] font-semibold">50% off</span> — {T.subtext("50%").replace("50% off — ", "")}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLAN_META.map((meta) => {
            const plan = T.plans[meta.id];
            const showSale = meta.salePrice !== null;
            return (
              <div key={meta.id} className={`relative ${meta.bgClass} border ${meta.borderClass} rounded-2xl p-8`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <div className="text-white/50 text-sm font-semibold uppercase tracking-wider mb-1">{meta.id.charAt(0).toUpperCase() + meta.id.slice(1)}</div>
                  {showSale ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-white">{meta.salePrice}</span>
                      <span className="text-base font-normal text-white/40 line-through">{meta.price}</span>
                      <span className="text-base font-normal text-white/40">{meta.period}</span>
                    </div>
                  ) : (
                    <div className="text-4xl font-bold text-white">
                      {meta.price}<span className="text-base font-normal text-white/40">{meta.period}</span>
                    </div>
                  )}
                  {showSale && (
                    <div className="mt-1 inline-flex items-center gap-1 bg-[#f5c518]/10 border border-[#f5c518]/20 text-[#f5c518] text-xs font-semibold px-2 py-0.5 rounded-full">
                      {T.limitedOffer("50%")}
                    </div>
                  )}
                  <div className="text-white/40 text-sm mt-1">{plan.description}</div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                      <Check size={14} className={`${meta.checkClass} flex-shrink-0`} />{f}
                    </li>
                  ))}
                </ul>
                {meta.ctaType === "link" ? (
                  <Link href={(meta as { ctaHref?: string }).ctaHref ?? "/register"}
                    className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors ${meta.ctaClass}`}>
                    {plan.ctaLabel}
                  </Link>
                ) : (
                  <CheckoutButton plan={(meta as { ctaPlan?: "pro" | "premium" }).ctaPlan ?? "pro"} label={plan.ctaLabel}
                    className={`w-full py-3 rounded-xl font-semibold text-sm ${meta.ctaClass}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
