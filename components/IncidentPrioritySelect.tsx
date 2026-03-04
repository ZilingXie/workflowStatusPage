"use client";

import { IncidentPriority } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PriorityBadge } from "@/components/PriorityBadge";

type Props = {
  incidentId: string;
  initialPriority: IncidentPriority;
};

const OPTIONS: IncidentPriority[] = [IncidentPriority.L, IncidentPriority.M, IncidentPriority.H];

export function IncidentPrioritySelect({ incidentId, initialPriority }: Props): JSX.Element {
  const router = useRouter();
  const [priority, setPriority] = useState<IncidentPriority>(initialPriority);
  const [loading, setLoading] = useState(false);
  const changeTargets = OPTIONS.filter((option) => option !== priority);

  async function onChange(nextPriority: IncidentPriority): Promise<void> {
    if (nextPriority === priority || loading) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/incidents/${incidentId}/priority`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ priority: nextPriority })
      });

      if (!response.ok) {
        return;
      }

      setPriority(nextPriority);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium text-foreground">Current Priority:</span>
      <PriorityBadge priority={priority} />
      <span className="text-muted-foreground">|</span>
      <span className="font-medium text-foreground">Change To:</span>
      <div className="flex items-center gap-2">
        {changeTargets.map((option) => (
          <button
            type="button"
            key={option}
            onClick={() => {
              void onChange(option);
            }}
            disabled={loading}
            aria-label={`Change priority to ${option}`}
            className="h-auto min-h-0 rounded-full border-0 bg-transparent p-0 hover:bg-transparent disabled:opacity-50"
          >
            <PriorityBadge priority={option} />
          </button>
        ))}
      </div>
      <span className="ml-1 inline-flex h-4 w-4 items-center justify-center" aria-hidden={!loading}>
        <Loader2
          className={`h-3.5 w-3.5 text-muted-foreground ${loading ? "animate-spin opacity-100" : "opacity-0"}`}
        />
      </span>
    </div>
  );
}
