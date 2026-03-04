import { WorkflowRequestEventType, WorkflowRequestType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http";
import { canEditWorkflowRequestBase } from "@/lib/workflowRequests";
import { workflowRequestUpdateSchema } from "@/lib/validation";

type Params = {
  params: {
    id: string;
  };
};

function normalizeOptional(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function GET(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = getSessionFromRequest(request);
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const item = await prisma.workflowRequest.findUnique({
    where: {
      id: params.id
    },
    include: {
      sourceIncident: {
        select: {
          id: true,
          workflowName: true,
          executionId: true
        }
      },
      events: {
        orderBy: {
          createdAt: "asc"
        }
      },
      comments: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!item) {
    return jsonError("Workflow request not found", 404);
  }

  return NextResponse.json({
    success: true,
    item
  });
}

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
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

  const parsed = workflowRequestUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid workflow request update payload", 400);
  }

  const existing = await prisma.workflowRequest.findUnique({
    where: {
      id: params.id
    }
  });

  if (!existing) {
    return jsonError("Workflow request not found", 404);
  }

  if (!canEditWorkflowRequestBase(session.role, session.username, existing)) {
    return jsonError("Forbidden", 403);
  }

  const nextType = existing.type;
  const nextWorkflowName =
    parsed.data.workflowName !== undefined
      ? normalizeOptional(parsed.data.workflowName)
      : existing.workflowName;
  const nextRequestedWorkflowName =
    parsed.data.requestedWorkflowName !== undefined
      ? normalizeOptional(parsed.data.requestedWorkflowName)
      : existing.requestedWorkflowName;
  const nextBusinessGoal =
    parsed.data.businessGoal !== undefined
      ? normalizeOptional(parsed.data.businessGoal)
      : existing.businessGoal;
  const nextExpectedTrigger =
    parsed.data.expectedTrigger !== undefined
      ? normalizeOptional(parsed.data.expectedTrigger)
      : existing.expectedTrigger;

  if (nextType === WorkflowRequestType.IMPROVEMENT && !nextWorkflowName) {
    return jsonError("workflowName is required for IMPROVEMENT", 400);
  }

  if (nextType === WorkflowRequestType.NEW_WORKFLOW) {
    if (!nextRequestedWorkflowName || !nextBusinessGoal || !nextExpectedTrigger) {
      return jsonError(
        "requestedWorkflowName, businessGoal and expectedTrigger are required for NEW_WORKFLOW",
        400
      );
    }
  }

  const updateData = {
    ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
    ...(parsed.data.description !== undefined
      ? { description: parsed.data.description.trim() }
      : {}),
    ...(parsed.data.workflowName !== undefined ? { workflowName: nextWorkflowName } : {}),
    ...(parsed.data.workflowReference !== undefined
      ? { workflowReference: normalizeOptional(parsed.data.workflowReference) }
      : {}),
    ...(parsed.data.requestedWorkflowName !== undefined
      ? { requestedWorkflowName: nextRequestedWorkflowName }
      : {}),
    ...(parsed.data.businessGoal !== undefined ? { businessGoal: nextBusinessGoal } : {}),
    ...(parsed.data.expectedTrigger !== undefined
      ? { expectedTrigger: nextExpectedTrigger }
      : {}),
    ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {})
  };

  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.workflowRequest.update({
      where: {
        id: existing.id
      },
      data: updateData
    });

    await tx.workflowRequestEvent.create({
      data: {
        requestId: existing.id,
        eventType: WorkflowRequestEventType.UPDATED,
        actionReason: parsed.data.updateReason?.trim() || "Fields updated",
        actorUsername: session.username,
        actorRole: session.role
      }
    });

    return updated;
  });

  return NextResponse.json({
    success: true,
    item
  });
}
