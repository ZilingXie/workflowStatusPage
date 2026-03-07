import {
  IncidentPriority,
  Prisma,
  UserRole,
  WorkflowRequestStatus,
  WorkflowRequestType
} from "@prisma/client";

export const DEFAULT_WORKFLOW_REQUEST_PAGE_SIZE = 20;

export type WorkflowRequestFilters = {
  type?: WorkflowRequestType;
  status?: WorkflowRequestStatus;
  priority?: IncidentPriority;
  workflow?: string;
  assignee?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
};

const ALLOWED_TYPES = new Set<WorkflowRequestType>([
  WorkflowRequestType.IMPROVEMENT,
  WorkflowRequestType.NEW_WORKFLOW
]);

const ALLOWED_STATUSES = new Set<WorkflowRequestStatus>([
  WorkflowRequestStatus.PROPOSED,
  WorkflowRequestStatus.CLARIFIED,
  WorkflowRequestStatus.IN_PROGRESS,
  WorkflowRequestStatus.DONE,
  WorkflowRequestStatus.REJECTED
]);

const ALLOWED_PRIORITIES = new Set<IncidentPriority>([
  IncidentPriority.L,
  IncidentPriority.M,
  IncidentPriority.H
]);

function parseDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

export function parseWorkflowRequestFilters(params: URLSearchParams): WorkflowRequestFilters {
  const typeParam = params.get("type") ?? undefined;
  const statusParam = params.get("status") ?? undefined;
  const priorityParam = params.get("priority") ?? undefined;
  const workflowParam = params.get("workflow")?.trim();
  const assigneeParam = params.get("assignee")?.trim();
  const fromParam = params.get("from") ?? undefined;
  const toParam = params.get("to") ?? undefined;
  const pageValue = Number(params.get("page") ?? "1");
  const pageSizeValue = Number(params.get("pageSize") ?? `${DEFAULT_WORKFLOW_REQUEST_PAGE_SIZE}`);

  const type =
    typeParam && ALLOWED_TYPES.has(typeParam as WorkflowRequestType)
      ? (typeParam as WorkflowRequestType)
      : undefined;
  const status =
    statusParam && ALLOWED_STATUSES.has(statusParam as WorkflowRequestStatus)
      ? (statusParam as WorkflowRequestStatus)
      : undefined;
  const priority =
    priorityParam && ALLOWED_PRIORITIES.has(priorityParam as IncidentPriority)
      ? (priorityParam as IncidentPriority)
      : undefined;

  return {
    type,
    status,
    priority,
    workflow: workflowParam || undefined,
    assignee: assigneeParam || undefined,
    from: parseDate(fromParam),
    to: parseDate(toParam),
    page: Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : 1,
    pageSize:
      Number.isFinite(pageSizeValue) && pageSizeValue > 0
        ? Math.min(Math.floor(pageSizeValue), 100)
        : DEFAULT_WORKFLOW_REQUEST_PAGE_SIZE
  };
}

export function buildWorkflowRequestWhere(
  filters: WorkflowRequestFilters
): Prisma.WorkflowRequestWhereInput {
  const where: Prisma.WorkflowRequestWhereInput = {};

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.workflow) {
    where.OR = [
      {
        workflowName: {
          contains: filters.workflow,
          mode: "insensitive"
        }
      },
      {
        requestedWorkflowName: {
          contains: filters.workflow,
          mode: "insensitive"
        }
      }
    ];
  }

  if (filters.assignee) {
    where.assigneeUsername = {
      contains: filters.assignee,
      mode: "insensitive"
    };
  }

  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {})
    };
  }

  return where;
}

function equalsUsername(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function canEditWorkflowRequestBase(
  role: UserRole,
  sessionUsername: string,
  request: {
    proposedBy: string;
    status: WorkflowRequestStatus;
  }
): boolean {
  if (role === UserRole.ADMIN) {
    return true;
  }

  if (role !== UserRole.OPERATOR) {
    return false;
  }

  return request.status === WorkflowRequestStatus.PROPOSED && equalsUsername(sessionUsername, request.proposedBy);
}

const STATUS_TRANSITIONS: Record<WorkflowRequestStatus, WorkflowRequestStatus[]> = {
  PROPOSED: [WorkflowRequestStatus.CLARIFIED],
  CLARIFIED: [WorkflowRequestStatus.IN_PROGRESS, WorkflowRequestStatus.REJECTED],
  IN_PROGRESS: [WorkflowRequestStatus.DONE, WorkflowRequestStatus.REJECTED],
  DONE: [],
  REJECTED: []
};

export function getAllowedWorkflowRequestTransitions(
  status: WorkflowRequestStatus
): WorkflowRequestStatus[] {
  return STATUS_TRANSITIONS[status];
}

export function canTransitionWorkflowRequestStatus(
  role: UserRole,
  fromStatus: WorkflowRequestStatus,
  toStatus: WorkflowRequestStatus
): boolean {
  if (role !== UserRole.ADMIN) {
    return false;
  }

  return STATUS_TRANSITIONS[fromStatus].includes(toStatus);
}

export function canEditWorkflowRequestComment(
  role: UserRole,
  sessionUsername: string,
  authorUsername: string
): boolean {
  if (role === UserRole.ADMIN) {
    return true;
  }

  return equalsUsername(sessionUsername, authorUsername);
}

export function canDeleteWorkflowRequestComment(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}
