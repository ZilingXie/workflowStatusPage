import { IncidentPriority } from "@prisma/client";
import { PRIORITY_COLOR_MAP } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function PriorityBadge({ priority }: { priority: IncidentPriority }): JSX.Element {
  const colorClass = PRIORITY_COLOR_MAP[priority] ?? "bg-secondary text-secondary-foreground border-border";

  return (
    <span
      className={cn(
        "inline-flex min-w-8 items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium",
        colorClass
      )}
    >
      {priority}
    </span>
  );
}
