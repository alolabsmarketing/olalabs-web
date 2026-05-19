"use client";

interface DayData { date: string; minutes: number }

function intensity(m: number) {
  if (m === 0)  return "bg-white/5";
  if (m < 10)  return "bg-indigo-900/60";
  if (m < 20)  return "bg-indigo-700/70";
  if (m < 40)  return "bg-indigo-500/80";
  return "bg-indigo-400";
}

export default function ActivityCalendar({ data }: { data: DayData[] }) {
  const map = new Map(data.map((d) => [d.date, d.minutes]));
  const days = Array.from({ length: 84 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (83 - i));
    const key = d.toISOString().split("T")[0];
    return { date: key, minutes: map.get(key) ?? 0 };
  });

  const totalMinutes = data.reduce((s, d) => s + d.minutes, 0);

  let streak = 0;
  const today = new Date().toISOString().split("T")[0];
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].date > today) continue;
    if (days[i].minutes > 0) streak++; else break;
  }

  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/50 text-xs">{totalMinutes} min in last 12 weeks</span>
        {streak > 0 && <span className="text-amber-400 text-sm font-medium">🔥 {streak}-day streak</span>}
      </div>
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <div key={day.date} title={`${day.date}: ${day.minutes} min`}
                className={`w-3 h-3 rounded-sm ${intensity(day.minutes)}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
