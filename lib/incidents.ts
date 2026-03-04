import { IncidentPriority, IncidentStatus, Prisma, UserRole } from "@prisma/client";

export const DEFAULT_PAGE_SIZE = 20;

export type IncidentFilters = {
  status?: IncidentStatus;
  priority?: IncidentPriority;
  workflow?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
};

const ALLOWED_STATUSES = new Set<IncidentStatus>([
  IncidentStatus.OPEN,
  IncidentStatus.IN_PROGRESS,
  IncidentStatus.RESOLVED
]);

const ALLOWED_PRIORITIES = new Set<IncidentPriority>([
  IncidentPriority.L,
  IncidentPriority.M,
  IncidentPriority.H
]);

export function parseIncidentFilters(params: URLSearchParams): IncidentFilters {
  const pageValue = Number(params.get("page") ?? "1");
  const pageSizeValue = Number(params.get("pageSize") ?? `${DEFAULT_PAGE_SIZE}`);

  const statusParam = params.get("status") ?? undefined;
  const priorityParam = params.get("priority") ?? undefined;
  const workflowParam = params.get("workflow")?.trim();
  const fromParam = params.get("from") ?? undefined;
  const toParam = params.get("to") ?? undefined;

  const status =
    statusParam && ALLOWED_STATUSES.has(statusParam as IncidentStatus)
      ? (statusParam as IncidentStatus)
      : undefined;
  const priority =
    priorityParam && ALLOWED_PRIORITIES.has(priorityParam as IncidentPriority)
      ? (priorityParam as IncidentPriority)
      : undefined;

  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;

  return {
    status,
    priority,
    workflow: workflowParam || undefined,
    from: from && !Number.isNaN(from.getTime()) ? from : undefined,
    to: to && !Number.isNaN(to.getTime()) ? to : undefined,
    page: Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : 1,
    pageSize:
      Number.isFinite(pageSizeValue) && pageSizeValue > 0
        ? Math.min(Math.floor(pageSizeValue), 100)
        : DEFAULT_PAGE_SIZE
  };
}

export function buildIncidentWhere(filters: IncidentFilters): Prisma.IncidentWhereInput {
  const where: Prisma.IncidentWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.workflow) {
    where.workflowName = {
      contains: filters.workflow,
      mode: "insensitive"
    };
  }

  if (filters.from || filters.to) {
    where.failedAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {})
    };
  }

  return where;
}

export function canTransitionStatus(
  role: UserRole,
  fromStatus: IncidentStatus,
  toStatus: IncidentStatus
): boolean {
  if (fromStatus === IncidentStatus.OPEN && toStatus === IncidentStatus.IN_PROGRESS) {
    return true;
  }

  if (fromStatus === IncidentStatus.IN_PROGRESS && toStatus === IncidentStatus.RESOLVED) {
    return true;
  }

  if (
    role === UserRole.ADMIN &&
    fromStatus === IncidentStatus.RESOLVED &&
    toStatus === IncidentStatus.OPEN
  ) {
    return true;
  }

  return false;
}

export function escapeCsvField(value: string | null | undefined): string {
  if (value == null) {
    return "";
  }

  if (value.includes(",") || value.includes("\n") || value.includes("\"")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}
