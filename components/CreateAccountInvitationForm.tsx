"use client";

import { useState } from "react";
import { withBasePath } from "@/lib/basePath";

type SuccessState = {
  email: string;
  expiresAt: string;
} | null;

export function CreateAccountInvitationForm(): JSX.Element {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(withBasePath("/api/v1/accounts/invitations"), {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          email
        })
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? "Failed to create account invitation");
        setLoading(false);
        return;
      }

      const createdEmail = body?.item?.email;
      const createdExpiresAt = body?.item?.expiresAt;

      if (typeof createdEmail !== "string" || typeof createdExpiresAt !== "string") {
        setError("Invitation created but response payload is invalid");
        setLoading(false);
        return;
      }

      setSuccess({
        email: createdEmail,
        expiresAt: createdExpiresAt
      });
      setEmail("");
    } catch {
      setError("Failed to create account invitation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex max-w-2xl flex-col gap-5 rounded-lg border border-border bg-card p-6" onSubmit={onSubmit}>
      <div>
        <h1 className="text-xl font-semibold text-foreground">Invite New Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter an email address. The user will receive a setup link to create username and password.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="account-email">
          Email
        </label>
        <input
          id="account-email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          placeholder="ops@example.com"
          required
          disabled={loading}
          className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {success ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
          <p className="text-sm text-foreground">
            Invitation sent to <span className="font-medium">{success.email}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Expires at (UTC): {new Date(success.expiresAt).toISOString()}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send Invitation Email"}
      </button>
    </form>
  );
}
