import { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, SessionData, verifySessionToken } from "@/lib/auth/session";

export function getSessionFromRequest(request: NextRequest): SessionData | null {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}
