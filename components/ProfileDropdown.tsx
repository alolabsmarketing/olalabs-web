"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, ChevronDown } from "lucide-react";

interface ProfileDropdownProps {
  email?: string;
  plan?: string;
}

export function ProfileDropdown({ email = "", plan = "free" }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const initials = email ? email[0].toUpperCase() : "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
          {initials}
        </div>
        <span className="text-sm hidden sm:block">{email.split("@")[0]}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 glass-card py-1 z-50">
          <div className="px-4 py-2 border-b border-white/10">
            <p className="text-white text-sm font-medium truncate">{email}</p>
            <p className="text-white/40 text-xs capitalize">{plan} plan</p>
          </div>
          <button
            onClick={() => { setOpen(false); router.push("/profile"); }}
            className="w-full flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
          >
            <User size={14} /> Profile
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors text-sm"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
