"use client";

import { UserRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { withBasePath } from "@/lib/basePath";

type Props = {
  requestId: string;
  assigneeUsername: string | null;
  role: UserRole;
  assigneeOptions: string[];
};

export function WorkflowRequestAssigneeForm({
  requestId,
  assigneeUsername,
  role,
  assigneeOptions
}: Props): JSX.Element {
  const router = useRouter();
  const [nextAssignee, setNextAssignee] = useState(assigneeUsername ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(withBasePath(`/api/v1/workflow-requests/${requestId}/assignee`), {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          assigneeUsername: nextAssignee.length > 0 ? nextAssignee : null
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Failed to update assignee");
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Failed to update assignee");
    } finally {
      setLoading(false);
    }
  }

  if (role !== UserRole.ADMIN) {
    return (
      <section className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">Assignee</h3>
        <p className="mt-2 text-sm text-foreground">Current: {assigneeUsername ?? "-"}</p>
        <p className="mt-1 text-sm text-muted-foreground">Only ADMIN users can change assignee.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-sm font-semibold text-foreground">Assignee</h3>
      <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Assigned To</label>
          <select
            value={nextAssignee}
            onChange={(event) => setNextAssignee(event.target.value)}
            disabled={loading}
            className="h-10 rounded-md border border-input bg-input/50 px-3 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Unassigned</option>
            {assigneeOptions.map((username) => (
              <option key={username} value={username}>
                {username}
              </option>
            ))}
          </select>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Update Assignee"}
        </button>
      </form>
    </section>
  );
}
