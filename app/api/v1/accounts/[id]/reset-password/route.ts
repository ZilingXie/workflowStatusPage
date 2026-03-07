import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  createAccountInviteToken,
  getAccountInviteExpiresAt,
  hashAccountInviteToken,
  normalizeEmail
} from "@/lib/auth/invitations";
import { getSessionFromRequest } from "@/lib/auth/guards";
import { withBasePath } from "@/lib/basePath";
import { prisma } from "@/lib/db";
import { sendOperatorPasswordResetEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/http";

type Params = {
  params: {
    id: string;
  };
};

function toAbsoluteUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(path, normalizedBase).toString();
}

export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = getSessionFromRequest(request);
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  if (session.role !== UserRole.ADMIN) {
    return jsonError("Forbidden", 403);
  }

  const account = await prisma.userAccount.findUnique({
    where: {
      id: params.id
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true
    }
  });

  if (!account) {
    return jsonError("Account not found", 404);
  }

  if (account.role !== UserRole.OPERATOR) {
    return jsonError("Only OPERATOR accounts support reset password email", 400);
  }

  if (!account.email) {
    return jsonError("Operator account email is required before sending reset email", 400);
  }

  const email = normalizeEmail(account.email);
  const now = new Date();
  const activeInvite = await prisma.accountInvitation.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive"
      },
      usedAt: null,
      expiresAt: {
        gt: now
      }
    },
    select: {
      id: true
    }
  });

  if (activeInvite) {
    return jsonError("An active setup/reset link already exists for this account", 409);
  }

  const token = createAccountInviteToken();
  const tokenHash = hashAccountInviteToken(token);
  const expiresAt = getAccountInviteExpiresAt(now);

  const created = await prisma.accountInvitation.create({
    data: {
      email,
      role: account.role,
      tokenHash,
      createdBy: session.username,
      expiresAt
    },
    select: {
      id: true,
      email: true,
      expiresAt: true
    }
  });

  const inviteUrl = toAbsoluteUrl(env.appBaseUrl, withBasePath(`/accounts/invite/${token}`));

  try {
    await sendOperatorPasswordResetEmail({
      toEmail: created.email,
      username: account.username,
      inviteUrl,
      expiresAt: created.expiresAt
    });
  } catch {
    await prisma.accountInvitation.delete({
      where: {
        id: created.id
      }
    }).catch(() => undefined);

    return jsonError("Failed to send reset email. Check SMTP configuration.", 500);
  }

  return NextResponse.json(
    {
      success: true,
      item: {
        accountId: account.id,
        email: created.email,
        expiresAt: created.expiresAt.toISOString()
      }
    },
    {
      status: 201
    }
  );
}
