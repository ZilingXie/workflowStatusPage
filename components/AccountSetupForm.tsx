"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { withBasePath } from "@/lib/basePath";

type Props = {
  token: string;
  email: string;
};

export function AccountSetupForm({ token, email }: Props): JSX.Element {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(withBasePath("/api/v1/accounts/invitations/complete"), {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          token,
          username,
          password
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Failed to complete account setup");
        setLoading(false);
        return;
      }

      router.push("/login");
      router.refresh();
    } catch {
      setError("Failed to complete account setup");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Set Up Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invitation email: <span className="font-medium text-foreground">{email}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          If this email already has an OPERATOR account, enter the existing username to reset password.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="setup-username">
          Username
        </label>
        <input
          id="setup-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Choose username"
          autoComplete="username"
          required
          disabled={loading}
          className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="setup-password">
          Password
        </label>
        <input
          id="setup-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={loading}
          className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="setup-confirm-password">
          Confirm Password
        </label>
        <input
          id="setup-confirm-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          placeholder="Re-enter password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={loading}
          className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
