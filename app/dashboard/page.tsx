import Link from "next/link";
import { cookies } from "next/headers";
import { CHARACTERS } from "@/lib/characters";
import { supabaseAdmin } from "@/lib/supabase";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { ArrowRight, MessageCircle, Clock, Star, Settings2 } from "lucide-react";

async function getUserData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  if (!token) return null;

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, plan, sessions_count")
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
  };
}

export default async function DashboardPage() {
  const userData = await getUserData();
  const featured = CHARACTERS.find((c) => c.featured)!;
  const others = CHARACTERS.filter((c) => !c.featured);

  return (
    <div className="ola-gradient-bg relative min-h-screen">
      <div className="ola-wave" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        <header className="flex items-center justify-between mb-10">
          <Link href="/" className="text-white font-bold text-2xl tracking-tight">OLA</Link>
          <nav className="flex items-center gap-4 text-white/60 text-sm">
            <Link href="/dashboard" className="text-white font-medium">Home</Link>
            <Link href="/characters/editor" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Settings2 size={14} /> Characters
            </Link>
            <Link href="/practice" className="hover:text-white transition-colors">Practice</Link>
            {userData && (
              <ProfileDropdown email={userData.email} plan={userData.plan} />
            )}
          </nav>
        </header>

        <div className="mb-10">
          <h2 className="text-white text-2xl font-bold">
            {userData ? `Hoş geldin, ${userData.email.split("@")[0]}.` : "Good to see you."}
          </h2>
          <p className="text-white/50 text-sm mt-1">Choose a character and start practicing.</p>
        </div>

        <div className="glass-card p-6 mb-6 flex items-center gap-6">
          <div
            className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center border-2 border-white/30"
            style={{ background: `radial-gradient(circle, ${featured.color}30, transparent)` }}
          >
            <span className="text-2xl font-bold" style={{ color: featured.color }}>
              {featured.avatarInitials}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-yellow-400 text-xs font-semibold">★ FEATURED</span>
            </div>
            <h3 className="text-white text-lg font-bold">{featured.name}</h3>
            <p className="text-blue-300 text-sm">{featured.role}</p>
            <p className="text-white/50 text-sm mt-1">{featured.description}</p>
          </div>
          <Link
            href={`/practice?character=${featured.id}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#07112b] font-semibold text-sm hover:bg-white/90 transition-all flex-shrink-0"
          >
            Start <ArrowRight size={14} />
          </Link>
        </div>

        <h3 className="text-white/70 text-sm font-medium mb-4">All Characters</h3>
        <div className="grid grid-cols-2 gap-4 mb-10">
          {others.map((char) => (
            <Link
              key={char.id}
              href={`/practice?character=${char.id}`}
              className="glass-card p-5 flex items-center gap-4 hover:bg-white/10 transition-all"
            >
              <div
                className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center border border-white/20"
                style={{ background: `radial-gradient(circle, ${char.color}30, transparent)` }}
              >
                <span className="text-sm font-bold" style={{ color: char.color }}>
                  {char.avatarInitials}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">{char.name}</p>
                <p className="text-white/50 text-xs truncate">{char.role}</p>
              </div>
              <ArrowRight size={14} className="text-white/30 flex-shrink-0" />
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: MessageCircle, label: "Sessions", value: userData ? String(userData.sessionsCount) : "0" },
            {
              icon: Clock,
              label: "Hours practiced",
              value: userData && userData.totalMinutes > 0
                ? `${Math.floor(userData.totalMinutes / 60)}h ${userData.totalMinutes % 60}m`
                : "0h",
            },
            { icon: Star, label: "Avg. score", value: userData?.avgScore ? `${userData.avgScore}%` : "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass-card p-4 text-center">
              <Icon size={20} className="text-white/40 mx-auto mb-2" />
              <p className="text-white font-bold text-xl">{value}</p>
              <p className="text-white/50 text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
