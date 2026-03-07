import bcrypt from "bcryptjs";
import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { hashAccountInviteToken, isInvitationUsable } from "@/lib/auth/invitations";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { accountInvitationCompleteSchema } from "@/lib/validation";

function normalizeUsername(value: string): string {
  return value.trim();
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = accountInvitationCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid account setup payload", 400);
  }

  const tokenHash = hashAccountInviteToken(parsed.data.token);
  const username = normalizeUsername(parsed.data.username);
  const now = new Date();

  const invitation = await prisma.accountInvitation.findUnique({
    where: {
      tokenHash
    },
    select: {
      id: true,
      email: true,
      role: true,
      usedAt: true,
      expiresAt: true
    }
  });

  if (!invitation || !isInvitationUsable(invitation, now)) {
    return jsonError("Invitation is invalid or expired", 400);
  }

  const existingAccountByEmail = await prisma.userAccount.findFirst({
    where: {
      email: {
        equals: invitation.email,
        mode: "insensitive"
      }
    },
    select: {
      id: true,
      username: true,
      role: true
    }
  });

  const existingUsername = await prisma.userAccount.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive"
      }
    },
    select: {
      id: true
    }
  });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.accountInvitation.updateMany({
        where: {
          id: invitation.id,
          usedAt: null,
          expiresAt: {
            gt: now
          }
        },
        data: {
          usedAt: now,
          usedByUsername: username
        }
      });

      if (consumed.count !== 1) {
        throw new Error("INVITATION_NOT_AVAILABLE");
      }

      if (existingAccountByEmail) {
        if (existingAccountByEmail.role !== UserRole.OPERATOR) {
          throw new Error("RESET_ROLE_NOT_ALLOWED");
        }

        if (existingAccountByEmail.username.toLowerCase() !== username.toLowerCase()) {
          throw new Error("RESET_USERNAME_MISMATCH");
        }

        await tx.userAccount.update({
          where: {
            id: existingAccountByEmail.id
          },
          data: {
            passwordHash
          }
        });
        return;
      }

      if (existingUsername) {
        throw new Error("USERNAME_TAKEN");
      }

      await tx.userAccount.create({
        data: {
          username,
          email: invitation.email,
          role: invitation.role,
          passwordHash
        }
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVITATION_NOT_AVAILABLE") {
      return jsonError("Invitation is invalid or expired", 400);
    }

    if (error instanceof Error && error.message === "USERNAME_TAKEN") {
      return jsonError("Username is already taken", 409);
    }

    if (error instanceof Error && error.message === "RESET_USERNAME_MISMATCH") {
      return jsonError("Username does not match this account", 400);
    }

    if (error instanceof Error && error.message === "RESET_ROLE_NOT_ALLOWED") {
      return jsonError("Password reset via invitation is only allowed for OPERATOR accounts", 403);
    }

    if (isUniqueConstraintError(error)) {
      return jsonError("Username or email already exists", 409);
    }

    return jsonError("Failed to complete account setup", 500);
  }

  return NextResponse.json({
    success: true
  });
}
