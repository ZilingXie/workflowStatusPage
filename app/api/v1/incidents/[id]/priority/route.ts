import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http";
import { priorityUpdateSchema } from "@/lib/validation";

type Params = {
  params: {
    id: string;
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

  const parsed = priorityUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid priority payload", 400);
  }

  const existing = await prisma.incident.findUnique({
    where: {
      id: params.id
    },
    select: {
      id: true
    }
  });

  if (!existing) {
    return jsonError("Incident not found", 404);
  }

  const incident = await prisma.incident.update({
    where: {
      id: params.id
    },
    data: {
      priority: parsed.data.priority
    },
    select: {
      id: true,
      priority: true,
      updatedAt: true
    }
  });

  return NextResponse.json({
    success: true,
    incident
  });
}
