import { createHmac, timingSafeEqual } from "node:crypto";
import { UserRole } from "@prisma/client";
import { env } from "@/lib/env";

export const SESSION_COOKIE_NAME = "n8n_status_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export type SessionData = {
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
};

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", env.sessionSecret).update(payload).digest("base64url");
}

export function createSessionToken(input: { username: string; role: UserRole }): string {
  const now = Math.floor(Date.now() / 1000);

  const payload: SessionData = {
    username: input.username,
    role: input.role,
    iat: now,
    exp: now + SESSION_TTL_SECONDS
  };

  const payloadEncoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(payloadEncoded);

  return `${payloadEncoded}.${signature}`;
}

export function verifySessionToken(token: string): SessionData | null {
  const [payloadEncoded, signature] = token.split(".");

  if (!payloadEncoded || !signature) {
    return null;
  }

  const expected = sign(payloadEncoded);

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(fromBase64Url(payloadEncoded));
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  if (typeof candidate.username !== "string") {
    return null;
  }

  if (candidate.role !== UserRole.ADMIN && candidate.role !== UserRole.OPERATOR) {
    return null;
  }

  if (typeof candidate.exp !== "number" || typeof candidate.iat !== "number") {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (candidate.exp <= now) {
    return null;
  }

  return {
    username: candidate.username,
    role: candidate.role,
    exp: candidate.exp,
    iat: candidate.iat
  };
}
