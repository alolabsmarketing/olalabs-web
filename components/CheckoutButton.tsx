"use client";
import { useState } from "react";

interface Props {
  plan: "pro" | "premium";
  label: string;
  className?: string;
}

export default function CheckoutButton({ plan, label, className = "" }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (res.status === 401) {
        window.location.href = `/login?redirect=/pricing`;
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Network error, please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button onClick={handleClick} disabled={loading}
        className={`disabled:opacity-60 transition-colors ${className}`}
      >
        {loading ? "Loading..." : label}
      </button>
      {error && <p className="text-red-400 text-xs mt-1 text-center">{error}</p>}
    </div>
  );
}
