import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export type ServerSession = {
  username: string;
  role: UserRole;
};

export function requireServerSession(): ServerSession {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  const session = verifySessionToken(token);
  if (!session) {
    redirect("/login");
  }

  return {
    username: session.username,
    role: session.role
  };
}
