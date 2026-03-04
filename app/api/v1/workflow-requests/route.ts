import { IncidentPriority, UserRole, WorkflowRequestEventType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/guards";
import { getConfiguredUsernames } from "@/lib/auth/users";
import { jsonError } from "@/lib/http";
import {
  buildWorkflowRequestWhere,
  parseWorkflowRequestFilters
} from "@/lib/workflowRequests";
import { workflowRequestCreateSchema } from "@/lib/validation";

function normalizeOptional(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = getSessionFromRequest(request);
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const filters = parseWorkflowRequestFilters(request.nextUrl.searchParams);
  const where = buildWorkflowRequestWhere(filters);

  const [total, items] = await prisma.$transaction([
    prisma.workflowRequest.count({ where }),
    prisma.workflowRequest.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        type: true,
        title: true,
        workflowName: true,
        requestedWorkflowName: true,
        priority: true,
        status: true,
        proposedBy: true,
        assigneeUsername: true,
        sourceIncidentId: true,
        createdAt: true,
        updatedAt: true
      }
    })
  ] as const);

  return NextResponse.json({
    success: true,
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    items
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = getSessionFromRequest(request);
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = workflowRequestCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid workflow request payload", 400);
  }

  const assigneeUsername = normalizeOptional(parsed.data.assigneeUsername);

  if (assigneeUsername && session.role !== UserRole.ADMIN) {
    return jsonError("Only ADMIN can set assignee on create", 403);
  }

  if (assigneeUsername) {
    const usernames = new Set(getConfiguredUsernames().map((value) => value.toLowerCase()));
    if (!usernames.has(assigneeUsername.toLowerCase())) {
      return jsonError("assigneeUsername is not a configured user", 400);
    }
  }

  const sourceIncidentId = normalizeOptional(parsed.data.sourceIncidentId);
  if (sourceIncidentId) {
    const incident = await prisma.incident.findUnique({
      where: { id: sourceIncidentId },
      select: { id: true }
    });

    if (!incident) {
      return jsonError("sourceIncidentId does not exist", 400);
    }
  }

  const workflowName = normalizeOptional(parsed.data.workflowName);
  const workflowReference = normalizeOptional(parsed.data.workflowReference);
  const requestedWorkflowName = normalizeOptional(parsed.data.requestedWorkflowName);
  const businessGoal = normalizeOptional(parsed.data.businessGoal);
  const expectedTrigger = normalizeOptional(parsed.data.expectedTrigger);

  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.workflowRequest.create({
      data: {
        type: parsed.data.type,
        title: parsed.data.title.trim(),
        description: parsed.data.description.trim(),
        workflowName,
        workflowReference,
        requestedWorkflowName,
        businessGoal,
        expectedTrigger,
        priority: parsed.data.priority ?? IncidentPriority.L,
        proposedBy: session.username,
        assigneeUsername,
        sourceIncidentId
      }
    });

    await tx.workflowRequestEvent.create({
      data: {
        requestId: item.id,
        eventType: WorkflowRequestEventType.CREATED,
        toStatus: item.status,
        actorUsername: session.username,
        actorRole: session.role
      }
    });

    if (assigneeUsername) {
      await tx.workflowRequestEvent.create({
        data: {
          requestId: item.id,
          eventType: WorkflowRequestEventType.ASSIGNEE_CHANGED,
          fromAssignee: null,
          toAssignee: assigneeUsername,
          actionReason: "Assignee set on creation",
          actorUsername: session.username,
          actorRole: session.role
        }
      });
    }

    return item;
  });

  return NextResponse.json(
    {
      success: true,
      item: created
    },
    {
      status: 201
    }
  );
}
