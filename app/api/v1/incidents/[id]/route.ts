import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/guards";
import { jsonError } from "@/lib/http";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = getSessionFromRequest(request);
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  const incident = await prisma.incident.findUnique({
    where: {
      id: params.id
    },
    include: {
      events: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!incident) {
    return jsonError("Incident not found", 404);
  }

  return NextResponse.json({
    success: true,
    incident
  });
}
