import { IncidentPriority, WorkflowRequestType } from "@prisma/client";

export const STATUS_COLOR_MAP: Record<string, string> = {
  OPEN: "bg-red-500/10 text-red-700 border-red-500/25 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  IN_PROGRESS:
    "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  RESOLVED:
    "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  PROPOSED:
    "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
  TRIAGED:
    "bg-cyan-500/10 text-cyan-700 border-cyan-500/25 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30",
  PLANNED:
    "bg-indigo-500/10 text-indigo-700 border-indigo-500/25 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30",
  DONE: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  REJECTED:
    "bg-zinc-500/10 text-zinc-600 border-zinc-500/25 dark:bg-zinc-500/15 dark:text-zinc-400 dark:border-zinc-500/30"
};

export const PRIORITY_COLOR_MAP: Record<IncidentPriority, string> = {
  H: "bg-red-500/10 text-red-700 border-red-500/25 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  M: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  L: "bg-zinc-500/10 text-zinc-600 border-zinc-500/25 dark:bg-zinc-500/15 dark:text-zinc-400 dark:border-zinc-500/30"
};

export const TYPE_COLOR_MAP: Record<WorkflowRequestType, string> = {
  IMPROVEMENT:
    "bg-violet-500/10 text-violet-700 border-violet-500/25 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/30",
  NEW_WORKFLOW:
    "bg-sky-500/10 text-sky-700 border-sky-500/25 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30"
};
