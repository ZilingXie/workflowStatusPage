"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton(): JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout(): Promise<void> {
    setLoading(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" className="ghost" onClick={onLogout} disabled={loading}>
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
