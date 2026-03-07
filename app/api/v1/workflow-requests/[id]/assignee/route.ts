import { UserRole, WorkflowRequestEventType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/guards";
import { getAccountUsernames } from "@/lib/auth/users";
import { jsonError } from "@/lib/http";
import { workflowRequestAssigneeUpdateSchema } from "@/lib/validation";

type Params = {
  params: {
    id: string;
  };
};

function normalizeAssignee(value: string | null): string | null {
  if (value == null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = getSessionFromRequest(request);
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  if (session.role !== UserRole.ADMIN) {
    return jsonError("Forbidden", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = workflowRequestAssigneeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid assignee payload", 400);
  }

  const nextAssignee = normalizeAssignee(parsed.data.assigneeUsername);
  if (nextAssignee) {
    const usernames = new Set((await getAccountUsernames()).map((value) => value.toLowerCase()));
    if (!usernames.has(nextAssignee.toLowerCase())) {
      return jsonError("assigneeUsername is not an existing account", 400);
    }
  }

  const item = await prisma.workflowRequest.findUnique({
    where: {
      id: params.id
    },
    select: {
      id: true,
      assigneeUsername: true
    }
  });

  if (!item) {
    return jsonError("Workflow request not found", 404);
  }

  if ((item.assigneeUsername ?? null) === nextAssignee) {
    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        assigneeUsername: item.assigneeUsername
      }
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.workflowRequest.update({
      where: {
        id: item.id
      },
      data: {
        assigneeUsername: nextAssignee
      }
    });

    await tx.workflowRequestEvent.create({
      data: {
        requestId: item.id,
        eventType: WorkflowRequestEventType.ASSIGNEE_CHANGED,
        fromAssignee: item.assigneeUsername,
        toAssignee: nextAssignee,
        actorUsername: session.username,
        actorRole: session.role
      }
    });

    return next;
  });

  return NextResponse.json({
    success: true,
    item: updated
  });
}
