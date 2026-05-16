import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Ücretsiz",
    price: "₺0",
    period: "/ ay",
    description: "Başlamak için ideal",
    highlight: false,
    cta: "Hemen başla",
    ctaHref: "/register",
    features: [
      "Günde 3 konuşma",
      "2 AI karakter (Emma & Noah)",
      "Temel analiz raporu",
      "Son 5 seans geçmişi",
      "Sesli konuşma desteği",
    ],
    missing: [
      "Sophie (Business Coach)",
      "Sınırsız konuşma",
      "Detaylı AI feedback",
      "Özel senaryo oluşturma",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₺149",
    period: "/ ay",
    description: "Ciddi ilerleme için",
    highlight: true,
    cta: "Pro'ya geç",
    ctaHref: "/register",
    badge: "En popüler",
    features: [
      "Sınırsız konuşma",
      "Tüm AI karakterler (Sophie dahil)",
      "Detaylı AI analiz & feedback",
      "Sınırsız seans geçmişi",
      "Özel senaryo oluşturma",
      "Sesli konuşma desteği",
      "Öncelikli destek",
    ],
    missing: [],
  },
  {
    id: "family",
    name: "Aile",
    price: "₺349",
    period: "/ ay",
    description: "Tüm aile için",
    highlight: false,
    cta: "Aile planını seç",
    ctaHref: "/register",
    features: [
      "4 kullanıcı hesabı",
      "Pro'nun tüm özellikleri",
      "Aile yönetim paneli",
      "Her üye için ayrı ilerleme takibi",
      "Aylık aile ilerleme raporu",
      "Öncelikli destek",
    ],
    missing: [],
  },
];

export default function PricingPage() {
  return (
    <div className="ola-gradient-bg relative min-h-screen">
      <div className="ola-wave" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <Link href="/" className="text-white font-bold text-2xl tracking-tight">OLA</Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-white/60 hover:text-white text-sm font-medium transition-colors">
              Giriş yap
            </Link>
            <Link href="/register" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#07112b] rounded-full text-sm font-semibold hover:bg-white/90 transition-colors">
              Başla <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Sana uygun planı seç</h1>
          <p className="text-white/50 text-base">İngilizce yolculuğuna bugün başla. İstediğin zaman iptal edebilirsin.</p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-7 flex flex-col ${
                plan.highlight
                  ? "bg-white/10 border-2 border-blue-400/60 backdrop-blur-xl"
                  : "bg-white/5 border border-white/10 backdrop-blur-xl"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`text-4xl font-bold ${plan.highlight ? "text-white" : "text-white"}`}>
                    {plan.price}
                  </span>
                  <span className="text-white/40 text-sm">{plan.period}</span>
                </div>
                <p className="text-white/40 text-sm">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/80">
                    <Check size={15} className={`mt-0.5 flex-shrink-0 ${plan.highlight ? "text-blue-400" : "text-emerald-400"}`} />
                    {f}
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/25 line-through">
                    <span className="w-[15px] mt-0.5 flex-shrink-0">–</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`w-full py-2.5 rounded-xl text-center text-sm font-semibold transition-all ${
                  plan.highlight
                    ? "bg-white text-[#07112b] hover:bg-white/90"
                    : "bg-white/10 text-white hover:bg-white/15 border border-white/15"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 text-center">
          <p className="text-white/30 text-sm">
            Sorularınız mı var?{" "}
            <a href="mailto:destek@olalabs.io" className="text-white/50 hover:text-white underline transition-colors">
              destek@olalabs.io
            </a>{" "}
            adresine yazın.
          </p>
        </div>
      </div>
    </div>
  );
}
