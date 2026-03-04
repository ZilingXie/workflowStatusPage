import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { findUserByUsername } from "@/lib/auth/users";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";
import { loginSchema } from "@/lib/validation";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid username or password", 400);
  }

  const user = findUserByUsername(parsed.data.username);
  if (!user) {
    return jsonError("Invalid username or password", 401);
  }

  const isValidPassword = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!isValidPassword) {
    return jsonError("Invalid username or password", 401);
  }

  const token = createSessionToken({ username: user.username, role: user.role });

  const response = NextResponse.json({
    success: true,
    user: {
      username: user.username,
      role: user.role
    }
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  });

  return response;
}
