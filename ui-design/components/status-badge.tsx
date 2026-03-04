import { cn } from "@/lib/utils"
import { STATUS_COLOR_MAP } from "@/lib/constants"

export function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLOR_MAP[status] || "bg-secondary text-secondary-foreground border-border"
  const label = status.replace(/_/g, " ")

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        colorClass
      )}
    >
      {label}
    </span>
  )
}
