import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CHARACTERS } from "@/lib/characters";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { translations, parseLang } from "@/lib/i18n";
import { MessageCircle, Clock, Star, Check, Zap, Flame } from "lucide-react";
import CheckoutButton from "@/components/CheckoutButton";
import { canUseCharacter, getCustomCharacterLimit } from "@/lib/plan";
import CharacterCard from "@/components/CharacterCard";
import CustomCharacterCard from "@/components/CustomCharacterCard";
import DashboardTabs from "@/components/DashboardTabs";
import UsageBar from "@/components/UsageBar";
import type { DbCustomCharacter } from "@/lib/db-types";

function calculateStreak(dates: Array<{ date: string }>): number {
  if (!dates?.length) return 0;
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (dates[0].date !== today && dates[0].date !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1].date);
    const curr = new Date(dates[i].date);
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

async function getUserData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  if (!token) return null;

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError) console.error("[getUserData] auth error:", authError.message);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, plan, sessions_count, level, goal, language, display_name")
    .eq("id", user.id)
    .single();

  const { data: recentSessions } = await supabaseAdmin
    .from("sessions")
    .select("started_at, ended_at, character_id, analysis_results(grammar_score, vocabulary_score, fluency_score)")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(20);

  const { data: usageDates } = await supabaseAdmin
    .from("daily_usage")
    .select("date")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(60);

  const { data: customCharsData } = await supabaseAdmin
    .from("custom_characters")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const streak = calculateStreak(usageDates ?? []);

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

  // Per-character breakdown
  const charStats: Record<string, { sessions: number; minutes: number }> = {};
  for (const s of recentSessions ?? []) {
    const cid = (s as { character_id?: string }).character_id ?? "unknown";
    if (!charStats[cid]) charStats[cid] = { sessions: 0, minutes: 0 };
    charStats[cid].sessions += 1;
    if (s.ended_at) {
      const mins = Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
      charStats[cid].minutes += Math.max(0, mins);
    }
  }

  const profileRec = profile as Record<string, unknown> | null;
  return {
    email: profile?.email ?? user.email ?? "",
    displayName: (profileRec?.display_name as string | null) || (user.user_metadata?.full_name as string | null) || null,
    plan: profile?.plan ?? "free",
    sessionsCount: profile?.sessions_count ?? 0,
    totalMinutes,
    avgScore,
    level: profileRec?.level as string | null ?? null,
    goal: profileRec?.goal as string | null ?? null,
    language: profileRec?.language as string | null ?? null,
    streak,
    charStats,
    customCharacters: (customCharsData ?? []) as DbCustomCharacter[],
  };
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  // NEXT_LOCALE is set by the LanguageSwitcher component (new i18n system)
  // "lang" is the legacy cookie for profile-based language preference
  const nextLocaleCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const cookieLang = cookieStore.get("lang")?.value;
  const userData = await getUserData();

  if (!userData) {
    cookieStore.delete("sb-access-token");
    cookieStore.delete("sb-refresh-token");
    redirect("/login");
  }

  // Priority: profile language > NEXT_LOCALE (switcher) > legacy lang cookie
  const lang = parseLang(userData?.language ?? nextLocaleCookie ?? cookieLang);
  const T = translations[lang];
  const Td = T.dashboard;

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-white/6 bg-[#080808]/90 backdrop-blur-md">
        <Link href="/" className="text-white font-bold text-xl tracking-tight">olalabs</Link>
        <nav className="flex items-center gap-5 text-white/50 text-sm">
          <Link href="/dashboard" className="text-white font-medium">{Td.nav.home}</Link>
          <Link href="/dashboard#characters" className="hover:text-white transition-colors">{Td.nav.practice}</Link>
          <LanguageSwitcher compact />
          {userData && (
            <ProfileDropdown email={userData.email} displayName={userData.displayName ?? undefined} plan={userData.plan} lang={lang} />
          )}
        </nav>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-white text-2xl font-bold tracking-tight">
            {userData ? Td.welcome(userData.displayName ?? userData.email.split("@")[0]) : "Good to see you."}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
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
            { icon: Flame, label: Td.dayStreak, value: userData?.streak ? `${userData.streak}🔥` : "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl bg-white/4 border border-white/6 p-4 text-center">
              <Icon size={18} className="text-white/30 mx-auto mb-2" />
              <p className="text-white font-bold text-xl">{value}</p>
              <p className="text-white/40 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        {Object.keys(userData.charStats).length > 0 && (
          <div className="mb-10">
            <h2 className="text-white font-semibold text-base mb-4">{Td.recentActivity}</h2>
            <div className="flex flex-col gap-2">
              {CHARACTERS.filter((c) => userData.charStats[c.id])
                .sort((a, b) => (userData.charStats[b.id]?.sessions ?? 0) - (userData.charStats[a.id]?.sessions ?? 0))
                .map((char) => {
                  const stats = userData.charStats[char.id];
                  const maxSessions = Math.max(...Object.values(userData.charStats).map((s) => s.sessions));
                  const pct = maxSessions > 0 ? (stats.sessions / maxSessions) * 100 : 0;
                  return (
                    <div key={char.id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/3 border border-white/6">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        {char.photo ? (
                          <img src={char.photo} alt={char.name} className="w-full h-full object-cover object-top" />
                        ) : (
                          <div className="w-full h-full rounded-full" style={{ background: char.color }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-sm font-medium">{char.name}</span>
                          <span className="text-white/30 text-xs">{stats.sessions} session{stats.sessions !== 1 ? "s" : ""}{stats.minutes > 0 ? ` · ${stats.minutes}m` : ""}</span>
                        </div>
                        <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: char.color + "80" }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Characters + My Characters + Free Scenario tabs */}
        <div className="mb-10" id="characters">
          <DashboardTabs
            plan={userData.plan}
            charactersSection={
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-white font-semibold text-base">{Td.allCharacters}</h2>
                  <span className="text-white/30 text-xs">{CHARACTERS.length} characters</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            }
            myCharactersSection={
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-white font-semibold text-base">My Characters</h2>
                    {userData.plan === "free" && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/25">
                        PRO
                      </span>
                    )}
                  </div>
                  {getCustomCharacterLimit(userData.plan) > 0 && (
                    <span className="text-white/30 text-xs">
                      {userData.customCharacters.length} / {getCustomCharacterLimit(userData.plan)} used
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userData.customCharacters.map((char: DbCustomCharacter) => (
                    <CustomCharacterCard key={char.id} character={char} />
                  ))}
                  {getCustomCharacterLimit(userData.plan) > 0 &&
                    userData.customCharacters.length < getCustomCharacterLimit(userData.plan) && (
                      <Link href="/characters/new">
                        <div className="aspect-[3/4] flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 text-white/30 hover:border-white/25 hover:text-white/60 hover:bg-white/3 transition-all cursor-pointer">
                          <span className="text-2xl leading-none">＋</span>
                          <span className="text-xs font-medium">Add character</span>
                        </div>
                      </Link>
                    )}
                  {getCustomCharacterLimit(userData.plan) === 0 && (
                    <div className="aspect-[3/4] flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/8 text-white/20">
                      <span className="text-2xl leading-none">✦</span>
                      <span className="text-xs font-medium">Available on Pro</span>
                    </div>
                  )}
                  {userData.plan === "pro" &&
                    Array.from({ length: getCustomCharacterLimit("premium") - getCustomCharacterLimit("pro") }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-[3/4] flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 text-white/15 bg-white/[0.01]"
                      >
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">
                          ✦ Premium
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            }
          />
        </div>

        {/* Plans */}
        <h2 className="text-white font-semibold text-base mb-5">{Td.plans}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["free", "pro", "premium"] as const).map((planId) => {
            const planNames = { free: "Free", pro: "Pro", premium: "Premium" };
            const planPrices = { free: "$0", pro: "$4.50", premium: "$9.50" };
            const planOriginals = { free: null, pro: "$9", premium: "$19" };
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
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-white text-2xl font-bold">{planPrices[planId]}</span>
                  {planOriginals[planId] && (
                    <span className="text-white/30 text-sm line-through">{planOriginals[planId]}</span>
                  )}
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
      <UsageBar />
    </div>
  );
}
