// components/GoogleButton.tsx
"use client";

import { useState } from "react";

export function GoogleButton() {
  const [loading, setLoading] = useState(false);

  function handleGoogleLogin() {
    setLoading(true);
    window.location.href = "/api/auth/google";
  }

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={loading}
      className="w-full py-2.5 rounded-xl bg-white text-[#1a1a2e] font-semibold text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 mb-5"
    >
      {loading ? (
        <span className="text-[#1a1a2e]/60">Redirecting...</span>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.08 0-3.84-1.4-4.47-3.29H1.88v2.07A8 8 0 0 0 8.98 17z" />
            <path fill="#FBBC05" d="M4.51 10.52A4.8 4.8 0 0 1 4.26 9c0-.53.09-1.04.25-1.52V5.41H1.88A8 8 0 0 0 .98 9c0 1.29.31 2.51.9 3.59l2.63-2.07z" />
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.1 4.41l2.63 2.07c.63-1.89 2.39-3.3 4.47-3.3z" />
          </svg>
          Continue with Google
        </>
      )}
    </button>
  );
}
