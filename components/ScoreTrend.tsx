"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface DataPoint { date: string; grammar: number | null; vocabulary: number | null; fluency: number | null }

export default function ScoreTrend({ data }: { data: DataPoint[] }) {
  if (data.length < 3) return (
    <div className="flex items-center justify-center h-32 text-white/30 text-sm">
      Complete at least 3 analyzed sessions to see your trend
    </div>
  );

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <XAxis dataKey="label" tick={{ fill: "#ffffff40", fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: "#ffffff40", fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: "#1a1f3a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
          labelStyle={{ color: "#ffffff80", fontSize: 11 }} itemStyle={{ fontSize: 11 }} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#ffffff60" }} />
        <Line type="monotone" dataKey="grammar"    stroke="#6366f1" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="vocabulary" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="fluency"    stroke="#22d3ee" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
