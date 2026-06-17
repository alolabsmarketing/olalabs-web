"use client";

import { useState } from "react";
import ScenarioForm from "@/components/ScenarioForm";

interface Props {
  plan: string;
  charactersSection: React.ReactNode;
  myCharactersSection: React.ReactNode;
}

export default function DashboardTabs({ plan, charactersSection, myCharactersSection }: Props) {
  const [activeTab, setActiveTab] = useState<"characters" | "my-characters" | "free-scenario">("characters");

  return (
    <div>
      {/* Tab nav */}
      <div className="flex items-center gap-1 mb-6 border-b border-white/6 pb-0">
        {(
          [
            { id: "characters", label: "Characters" },
            { id: "my-characters", label: "My Characters" },
            { id: "free-scenario", label: "Free Scenario" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
              activeTab === tab.id
                ? "text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "characters" && <div>{charactersSection}</div>}
      {activeTab === "my-characters" && <div>{myCharactersSection}</div>}
      {activeTab === "free-scenario" && (
        <ScenarioForm plan={plan} />
      )}
    </div>
  );
}
