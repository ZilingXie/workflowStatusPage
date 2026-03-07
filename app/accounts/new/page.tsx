import { UserRole } from "@prisma/client";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireServerSession } from "@/lib/auth/server";

export default function NewAccountPage(): JSX.Element {
  const session = requireServerSession();

  if (session.role !== UserRole.ADMIN) {
    redirect("/incidents");
  }

  return (
    <AppShell session={session} activeNav="accounts">
      <div className="flex flex-col gap-6">
        <Link
          href="/accounts"
          className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Accounts
        </Link>

        <section className="max-w-2xl rounded-lg border border-border bg-card p-6">
          <h1 className="text-xl font-semibold text-foreground">Create Account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The create-account flow will be added in the next iteration.
          </p>

          <button
            type="button"
            disabled
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-60"
          >
            <Plus className="h-4 w-4" />
            Create Account (Coming Soon)
          </button>
        </section>
      </div>
    </AppShell>
  );
}
