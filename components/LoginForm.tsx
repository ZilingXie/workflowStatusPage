"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  username: string;
  password: string;
};

export function LoginForm(): JSX.Element {
  const router = useRouter();
  const [state, setState] = useState<FormState>({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(state)
      });

      if (!response.ok) {
        setError("Invalid username or password");
        setLoading(false);
        return;
      }

      router.push("/incidents");
      router.refresh();
    } catch {
      setError("Login failed. Please retry.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card stack" style={{ maxWidth: 400 }}>
      <h1>n8n Failure Status</h1>
      <p className="muted">Sign in with your internal account</p>

      <label className="stack">
        <span>Username</span>
        <input
          value={state.username}
          onChange={(event) => setState((prev) => ({ ...prev, username: event.target.value }))}
          name="username"
          autoComplete="username"
          disabled={loading}
          required
        />
      </label>

      <label className="stack">
        <span>Password</span>
        <input
          value={state.password}
          onChange={(event) => setState((prev) => ({ ...prev, password: event.target.value }))}
          name="password"
          type="password"
          autoComplete="current-password"
          disabled={loading}
          required
        />
      </label>

      {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}

      <button type="submit" disabled={loading}>
        {loading ? (
          <span className="button-loading">
            <span className="button-spinner" aria-hidden />
            <span>Signing in...</span>
          </span>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
