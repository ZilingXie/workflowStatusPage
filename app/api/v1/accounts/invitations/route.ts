import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { createAccountInviteToken, getAccountInviteExpiresAt, getAccountInviteRole, hashAccountInviteToken, normalizeEmail } from "@/lib/auth/invitations";
import { getSessionFromRequest } from "@/lib/auth/guards";
import { withBasePath } from "@/lib/basePath";
import { prisma } from "@/lib/db";
import { sendAccountInviteEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { accountInvitationCreateSchema } from "@/lib/validation";

function toAbsoluteUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(path, normalizedBase).toString();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  const parsed = accountInvitationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid account invitation payload", 400);
  }

  const email = normalizeEmail(parsed.data.email);
  const now = new Date();

  const [existingAccount, activeInvite] = await Promise.all([
    prisma.userAccount.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive"
        }
      },
      select: {
        id: true
      }
    }),
    prisma.accountInvitation.findFirst({
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
    })
  ] as const);

  if (existingAccount) {
    return jsonError("This email already has an account", 409);
  }

  if (activeInvite) {
    return jsonError("An active invitation already exists for this email", 409);
  }

  const token = createAccountInviteToken();
  const tokenHash = hashAccountInviteToken(token);
  const expiresAt = getAccountInviteExpiresAt(now);

  const created = await prisma.accountInvitation.create({
    data: {
      email,
      role: getAccountInviteRole(),
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
    await sendAccountInviteEmail({
      toEmail: created.email,
      inviteUrl,
      expiresAt: created.expiresAt
    });
  } catch {
    await prisma.accountInvitation.delete({
      where: {
        id: created.id
      }
    }).catch(() => undefined);

    return jsonError("Failed to send invitation email. Check SMTP configuration.", 500);
  }

  return NextResponse.json(
    {
      success: true,
      item: {
        id: created.id,
        email: created.email,
        expiresAt: created.expiresAt.toISOString()
      }
    },
    {
      status: 201
    }
  );
}
