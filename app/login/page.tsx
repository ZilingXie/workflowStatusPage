import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export default function LoginPage(): JSX.Element {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;

  if (token && verifySessionToken(token)) {
    redirect("/incidents");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <LoginForm />
    </main>
  );
}
