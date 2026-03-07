import { createHash, randomBytes } from "node:crypto";
import { UserRole } from "@prisma/client";

const DEFAULT_ACCOUNT_INVITE_TTL_HOURS = 24;
const MIN_ACCOUNT_INVITE_TTL_HOURS = 1;
const MAX_ACCOUNT_INVITE_TTL_HOURS = 168;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function createAccountInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAccountInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getAccountInviteRole(): UserRole {
  return UserRole.OPERATOR;
}

export function getAccountInviteTtlHours(): number {
  const raw = process.env.ACCOUNT_INVITE_TTL_HOURS;
  if (!raw) {
    return DEFAULT_ACCOUNT_INVITE_TTL_HOURS;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    return DEFAULT_ACCOUNT_INVITE_TTL_HOURS;
  }

  if (parsed < MIN_ACCOUNT_INVITE_TTL_HOURS || parsed > MAX_ACCOUNT_INVITE_TTL_HOURS) {
    return DEFAULT_ACCOUNT_INVITE_TTL_HOURS;
  }

  return parsed;
}

export function getAccountInviteExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + getAccountInviteTtlHours() * 60 * 60 * 1000);
}

export function isInvitationUsable(input: { usedAt: Date | null; expiresAt: Date }, now: Date = new Date()): boolean {
  if (input.usedAt) {
    return false;
  }

  return input.expiresAt.getTime() > now.getTime();
}
