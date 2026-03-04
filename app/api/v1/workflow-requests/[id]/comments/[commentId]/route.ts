import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http";
import {
  canDeleteWorkflowRequestComment,
  canEditWorkflowRequestComment
} from "@/lib/workflowRequests";
import { workflowRequestCommentUpdateSchema } from "@/lib/validation";

type Params = {
  params: {
    id: string;
    commentId: string;
  };
};

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

  const parsed = workflowRequestCommentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid comment payload", 400);
  }

  const comment = await prisma.workflowRequestComment.findUnique({
    where: {
      id: params.commentId
    },
    select: {
      id: true,
      requestId: true,
      authorUsername: true
    }
  });

  if (!comment || comment.requestId !== params.id) {
    return jsonError("Comment not found", 404);
  }

  if (!canEditWorkflowRequestComment(session.role, session.username, comment.authorUsername)) {
    return jsonError("Forbidden", 403);
  }

  const updated = await prisma.workflowRequestComment.update({
    where: {
      id: comment.id
    },
    data: {
      content: parsed.data.content.trim()
    }
  });

  return NextResponse.json({
    success: true,
    comment: updated
  });
}

export async function DELETE(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = getSessionFromRequest(request);
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  if (!canDeleteWorkflowRequestComment(session.role)) {
    return jsonError("Forbidden", 403);
  }

  const comment = await prisma.workflowRequestComment.findUnique({
    where: {
      id: params.commentId
    },
    select: {
      id: true,
      requestId: true
    }
  });

  if (!comment || comment.requestId !== params.id) {
    return jsonError("Comment not found", 404);
  }

  await prisma.workflowRequestComment.delete({
    where: {
      id: comment.id
    }
  });

  return NextResponse.json({
    success: true
  });
}
