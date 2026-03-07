"use client";

import { useState } from "react";
import { withBasePath } from "@/lib/basePath";

type Props = {
  accountId: string;
  email: string | null;
};

export function OperatorResetPasswordButton({ accountId, email }: Props): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onResetPassword(): Promise<void> {
    if (!email || loading) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(withBasePath(`/api/v1/accounts/${accountId}/reset-password`), {
        method: "POST"
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Failed to send reset email");
        setLoading(false);
        return;
      }

      setMessage("Reset email sent.");
    } catch {
      setError("Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  if (!email) {
    return <span className="text-xs text-muted-foreground">No email</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => {
          void onResetPassword();
        }}
        disabled={loading}
        className="w-fit rounded-md border border-input bg-secondary/40 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
      >
        {loading ? "Sending..." : "Reset Password"}
      </button>
      {message ? <p className="text-xs text-emerald-500">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
