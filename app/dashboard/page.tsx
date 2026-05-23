import Link from "next/link";
import { cookies } from "next/headers";
import { CHARACTERS } from "@/lib/characters";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { translations, parseLang } from "@/lib/i18n";
import { MessageCircle, Clock, Star, Check, Zap } from "lucide-react";
import CheckoutButton from "@/components/CheckoutButton";
import { canUseCharacter } from "@/lib/plan";
import CharacterCard from "@/components/CharacterCard";

async function getUserData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  if (!token) return null;

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError) console.error("[getUserData] auth error:", authError.message);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, plan, sessions_count, level, goal, language")
    .eq("id", user.id)
    .single();

  const { data: recentSessions } = await supabaseAdmin
    .from("sessions")
    .select("started_at, ended_at, analysis_results(grammar_score, vocabulary_score, fluency_score)")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(10);

  const scores = (recentSessions ?? [])
    .flatMap((s: { analysis_results: Array<{ grammar_score: number | null; vocabulary_score: number | null; fluency_score: number | null }> }) => s.analysis_results ?? [])
    .map((a: { grammar_score: number | null; vocabulary_score: number | null; fluency_score: number | null }) =>
      ((a.grammar_score ?? 0) + (a.vocabulary_score ?? 0) + (a.fluency_score ?? 0)) / 3
    )
    .filter((s: number) => s > 0);

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
    : null;

  const totalMinutes = (recentSessions ?? [])
    .filter((s: { ended_at: string | null }) => s.ended_at)
    .reduce((acc: number, s: { started_at: string; ended_at: string | null }) => {
      const mins = Math.round((new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime()) / 60000);
      return acc + Math.max(0, mins);
    }, 0);

  return {
    email: profile?.email ?? user.email ?? "",
    plan: profile?.plan ?? "free",
    sessionsCount: profile?.sessions_count ?? 0,
    totalMinutes,
    avgScore,
    level: (profile as Record<string, unknown> | null)?.level as string | null ?? null,
    goal: (profile as Record<string, unknown> | null)?.goal as string | null ?? null,
    language: (profile as Record<string, unknown> | null)?.language as string | null ?? null,
  };
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("lang")?.value;
  const userData = await getUserData();
  const lang = parseLang(userData?.language ?? cookieLang);
  const T = translations[lang];
  const Td = T.dashboard;

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-white/6 bg-[#080808]/90 backdrop-blur-md">
        <Link href="/" className="text-white font-bold text-xl tracking-tight">olalabs</Link>
        <nav className="flex items-center gap-5 text-white/50 text-sm">
          <Link href="/dashboard" className="text-white font-medium">{Td.nav.home}</Link>
          <Link href="/practice" className="hover:text-white transition-colors">{Td.nav.practice}</Link>
          {userData && (
            <ProfileDropdown email={userData.email} plan={userData.plan} lang={lang} />
          )}
        </nav>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-white text-2xl font-bold tracking-tight">
            {userData ? Td.welcome(userData.email.split("@")[0]) : "Good to see you."}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-white/40 text-sm">{Td.subtitle}</p>
            {userData?.level && (
              <span className="px-2 py-0.5 rounded-full bg-white/8 text-white/40 text-xs capitalize border border-white/8">{userData.level}</span>
            )}
            {userData?.goal && (
              <span className="px-2 py-0.5 rounded-full bg-white/8 text-white/40 text-xs capitalize border border-white/8">{userData.goal}</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { icon: MessageCircle, label: Td.sessions, value: userData ? String(userData.sessionsCount) : "0" },
            {
              icon: Clock,
              label: Td.hoursPracticed,
              value: userData && userData.totalMinutes > 0
                ? `${Math.floor(userData.totalMinutes / 60)}h ${userData.totalMinutes % 60}m`
                : "0h",
            },
            { icon: Star, label: Td.avgScore, value: userData?.avgScore ? `${userData.avgScore}%` : "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl bg-white/4 border border-white/6 p-4 text-center">
              <Icon size={18} className="text-white/30 mx-auto mb-2" />
              <p className="text-white font-bold text-xl">{value}</p>
              <p className="text-white/40 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Characters */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold text-base">{Td.allCharacters}</h2>
            <span className="text-white/30 text-xs">{CHARACTERS.length} characters</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {CHARACTERS.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                locked={!canUseCharacter(userData?.plan, char.id)}
                label={Td.start}
              />
            ))}
          </div>
        </div>

        {/* Plans */}
        <h2 className="text-white font-semibold text-base mb-5">{Td.plans}</h2>
        <div className="grid grid-cols-3 gap-4">
          {(["free", "pro", "premium"] as const).map((planId) => {
            const planNames = { free: "Free", pro: "Pro", premium: "Premium" };
            const planPrices = { free: "$0", pro: "$9", premium: "$19" };
            const planPeriods = { free: "", pro: "/ mo", premium: "/ mo" };
            const isCurrent = !userData ? planId === "free" : userData.plan === planId;
            const highlight = planId === "pro";

            return (
              <div
                key={planId}
                className={`rounded-2xl p-5 flex flex-col gap-3 border ${
                  highlight
                    ? "bg-white/6 border-white/15"
                    : "bg-white/3 border-white/6"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-white font-semibold text-sm">{planNames[planId]}</p>
                  {isCurrent && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/40 border border-white/8">{Td.current}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-white text-2xl font-bold">{planPrices[planId]}</span>
                  {planPeriods[planId] && <span className="text-white/30 text-xs">{planPeriods[planId]}</span>}
                </div>
                <ul className="flex flex-col gap-1.5 flex-1">
                  {Td.planFeatures[planId].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-white/50 text-xs">
                      <Check size={10} className="text-white/30 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && planId !== "free" && (
                  <CheckoutButton
                    plan={planId}
                    label={`${Td.upgrade} ${planNames[planId]}`}
                    className="mt-2 flex items-center justify-center gap-1.5 w-full py-2 rounded-full bg-white/8 hover:bg-white/12 text-white text-xs font-medium transition-all border border-white/10"
                  />
                )}
                {!isCurrent && planId === "free" && (
                  <a href="/register" className="mt-2 flex items-center justify-center gap-1.5 w-full py-2 rounded-full bg-white/8 hover:bg-white/12 text-white text-xs font-medium transition-all border border-white/10 text-center">
                    <Zap size={11} /> {Td.upgrade}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
