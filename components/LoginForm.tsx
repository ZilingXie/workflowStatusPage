"use client";

import { Activity } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Activity className="h-6 w-6" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">N8N Workflow Monitor</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to manage workflow incidents</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="username" className="text-sm font-medium text-foreground">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={state.username}
            onChange={(event) => setState((prev) => ({ ...prev, username: event.target.value }))}
            placeholder="Enter username"
            name="username"
            autoComplete="username"
            disabled={loading}
            required
            className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={state.password}
            onChange={(event) => setState((prev) => ({ ...prev, password: event.target.value }))}
            placeholder="Enter password"
            name="password"
            autoComplete="current-password"
            disabled={loading}
            required
            className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
