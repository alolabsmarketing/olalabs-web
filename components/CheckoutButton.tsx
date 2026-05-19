"use client";
import { useState } from "react";

interface Props {
  plan: "pro" | "premium";
  label: string;
  className?: string;
}

export default function CheckoutButton({ plan, label, className = "" }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleClick} disabled={loading}
      className={`disabled:opacity-60 transition-colors ${className}`}
    >
      {loading ? "Loading..." : label}
    </button>
  );
}
