import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http";
import { workflowRequestCommentCreateSchema } from "@/lib/validation";

type Params = {
  params: {
    id: string;
  };
};

export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = getSessionFromRequest(request);
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const item = await prisma.workflowRequest.findUnique({
    where: {
      id: params.id
    },
    select: {
      id: true
    }
  });

  if (!item) {
    return jsonError("Workflow request not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = workflowRequestCommentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid comment payload", 400);
  }

  const comment = await prisma.workflowRequestComment.create({
    data: {
      requestId: item.id,
      authorUsername: session.username,
      authorRole: session.role,
      content: parsed.data.content.trim()
    }
  });

  return NextResponse.json(
    {
      success: true,
      comment
    },
    {
      status: 201
    }
  );
}
