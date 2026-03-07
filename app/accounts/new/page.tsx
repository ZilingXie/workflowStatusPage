import { UserRole } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CreateAccountInvitationForm } from "@/components/CreateAccountInvitationForm";
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

        <CreateAccountInvitationForm />
      </div>
    </AppShell>
  );
}
