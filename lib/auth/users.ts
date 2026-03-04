import { UserRole } from "@prisma/client";
import { env } from "@/lib/env";

type ConfiguredUser = {
  username: string;
  role: UserRole;
  passwordHash: string;
};

let cachedUsers: ConfiguredUser[] | null = null;

function parseConfiguredUsers(): ConfiguredUser[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(env.appUsersJson);
  } catch {
    throw new Error("APP_USERS_JSON must be valid JSON");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("APP_USERS_JSON must be a JSON array");
  }

  const users: ConfiguredUser[] = parsed.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("APP_USERS_JSON contains an invalid user record");
    }

    const candidate = item as Record<string, unknown>;
    const username = candidate.username;
    const role = candidate.role;
    const passwordHash = candidate.passwordHash;

    if (typeof username !== "string" || username.length === 0) {
      throw new Error("APP_USERS_JSON user.username must be a non-empty string");
    }

    if (role !== UserRole.ADMIN && role !== UserRole.OPERATOR) {
      throw new Error("APP_USERS_JSON user.role must be ADMIN or OPERATOR");
    }

    if (typeof passwordHash !== "string" || passwordHash.length < 20) {
      throw new Error("APP_USERS_JSON user.passwordHash appears invalid");
    }

    const normalizedHash = passwordHash.replace(/\\\$/g, "$");

    return {
      username,
      role,
      passwordHash: normalizedHash
    };
  });

  if (users.length === 0) {
    throw new Error("APP_USERS_JSON must include at least one user");
  }

  return users;
}

export function getConfiguredUsers(): ConfiguredUser[] {
  if (!cachedUsers) {
    cachedUsers = parseConfiguredUsers();
  }

  return cachedUsers;
}

export function findUserByUsername(username: string): ConfiguredUser | undefined {
  const normalized = username.trim().toLowerCase();
  return getConfiguredUsers().find((user) => user.username.toLowerCase() === normalized);
}
