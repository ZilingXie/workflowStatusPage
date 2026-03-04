import { cn } from "@/lib/utils"
import { PRIORITY_COLOR_MAP } from "@/lib/constants"
import type { IncidentPriority } from "@/lib/types"

export function PriorityBadge({ priority }: { priority: IncidentPriority }) {
  const colorClass = PRIORITY_COLOR_MAP[priority] || "bg-secondary text-secondary-foreground border-border"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        colorClass
      )}
    >
      {priority}
    </span>
  )
}
