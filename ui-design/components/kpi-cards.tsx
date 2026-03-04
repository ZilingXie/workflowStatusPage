"use client"

import type { Incident } from "@/lib/types"
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react"

interface KpiCardsProps {
  incidents: Incident[]
}

export function KpiCards({ incidents }: KpiCardsProps) {
  const open = incidents.filter((i) => i.status === "OPEN").length
  const inProgress = incidents.filter((i) => i.status === "IN_PROGRESS").length
  const resolved = incidents.filter((i) => i.status === "RESOLVED").length

  const cards = [
    {
      label: "Open",
      value: open,
      icon: AlertCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
    },
    {
      label: "In Progress",
      value: inProgress,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
    {
      label: "Resolved",
      value: resolved,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`flex items-center gap-4 rounded-lg border ${card.borderColor} bg-card p-4`}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bgColor}`}
          >
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
