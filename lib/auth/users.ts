import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";

export type AuthUser = {
  username: string;
  role: UserRole;
  passwordHash: string;
};

export type UserAccountSummary = {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeUsername(value: string): string {
  return value.trim();
}

export async function findUserByUsername(username: string): Promise<AuthUser | null> {
  const normalized = normalizeUsername(username);

  if (!normalized) {
    return null;
  }

  const user = await prisma.userAccount.findFirst({
    where: {
      username: {
        equals: normalized,
        mode: "insensitive"
      }
    },
    orderBy: {
      createdAt: "asc"
    },
    select: {
      username: true,
      role: true,
      passwordHash: true
    }
  });

  if (!user) {
    return null;
  }

  return user;
}

export async function getAccountUsernames(): Promise<string[]> {
  const users = await prisma.userAccount.findMany({
    orderBy: {
      username: "asc"
    },
    select: {
      username: true
    }
  });

  return users.map((user) => user.username);
}

export async function listUserAccounts(): Promise<UserAccountSummary[]> {
  return prisma.userAccount.findMany({
    orderBy: {
      username: "asc"
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });
}
