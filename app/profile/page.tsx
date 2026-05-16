import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { ArrowLeft, MessageCircle, Star, Calendar } from "lucide-react";

async function getProfileData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  if (!token) return null;

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError) console.error("[getProfileData] auth error:", authError.message);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, plan, sessions_count, created_at")
    .eq("id", user.id)
    .single();

  const { data: sessions } = await supabaseAdmin
    .from("sessions")
    .select(`
      id,
      character_id,
      scenario,
      message_count,
      started_at,
      ended_at,
      analysis_results (grammar_score, vocabulary_score, fluency_score)
    `)
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(20);

  return { profile, sessions: sessions ?? [] };
}

function avgScore(analysis: Array<{ grammar_score: number | null; vocabulary_score: number | null; fluency_score: number | null }>) {
  const vals = analysis
    .flatMap((a) => [a.grammar_score, a.vocabulary_score, a.fluency_score])
    .filter((v): v is number => v !== null);
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export default async function ProfilePage() {
  const data = await getProfileData();
  if (!data) redirect("/login");

  const { profile, sessions } = data;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("tr-TR", { year: "numeric", month: "long" })
    : "—";

  return (
    <div className="ola-gradient-bg relative min-h-screen">
      <div className="ola-wave" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-8">
        <header className="flex items-center justify-between mb-10">
          <Link href="/dashboard" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <ProfileDropdown email={profile?.email ?? ""} plan={profile?.plan ?? "free"} />
        </header>

        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold text-white">
              {(profile?.email ?? "?")[0].toUpperCase()}
            </div>
            <div>
              <p className="text-white font-bold text-lg">{profile?.email}</p>
              <p className="text-white/50 text-sm capitalize">{profile?.plan ?? "free"} plan · {memberSince}&apos;dan beri</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Toplam Oturum", value: String(profile?.sessions_count ?? 0), icon: MessageCircle },
              {
                label: "Ort. Skor",
                value: (() => {
                  const scores = sessions
                    .flatMap((s) => s.analysis_results ?? [])
                    .map((a) => avgScore([a]))
                    .filter((s): s is number => s !== null);
                  return scores.length
                    ? `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%`
                    : "—";
                })(),
                icon: Star,
              },
              { label: "Üye Tarihi", value: memberSince, icon: Calendar },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                <Icon size={16} className="text-white/40 mx-auto mb-1" />
                <p className="text-white font-bold">{value}</p>
                <p className="text-white/40 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <h3 className="text-white/70 text-sm font-medium mb-3">Oturum Geçmişi</h3>
        {sessions.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-white/40 text-sm">Henüz oturum yok.</p>
            <Link href="/practice" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">
              İlk oturumu başlat →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const score = avgScore(session.analysis_results ?? []);
              const duration = session.ended_at
                ? Math.round(
                    (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000
                  )
                : null;

              return (
                <div key={session.id} className="glass-card p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium capitalize">{session.character_id}</p>
                    {session.scenario && (
                      <p className="text-white/40 text-xs truncate">{session.scenario}</p>
                    )}
                    <p className="text-white/30 text-xs mt-0.5">
                      {new Date(session.started_at).toLocaleDateString("tr-TR")}
                      {duration ? ` · ${duration} dk` : ""}
                      {" · "}{session.message_count} mesaj
                    </p>
                  </div>
                  {score !== null && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-bold">{score}%</p>
                      <p className="text-white/40 text-xs">skor</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
