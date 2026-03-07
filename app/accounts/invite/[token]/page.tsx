import Link from "next/link";
import { AccountSetupForm } from "@/components/AccountSetupForm";
import { hashAccountInviteToken, isInvitationUsable } from "@/lib/auth/invitations";
import { prisma } from "@/lib/db";

type Params = {
  params: {
    token: string;
  };
};

export default async function AccountInvitePage({ params }: Params): Promise<JSX.Element> {
  const token = params.token;
  const invitation = await prisma.accountInvitation.findUnique({
    where: {
      tokenHash: hashAccountInviteToken(token)
    },
    select: {
      email: true,
      usedAt: true,
      expiresAt: true
    }
  });

  const isValid = invitation ? isInvitationUsable(invitation) : false;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {invitation && isValid ? (
          <AccountSetupForm token={token} email={invitation.email} />
        ) : (
          <section className="rounded-lg border border-border bg-card p-6">
            <h1 className="text-xl font-semibold text-foreground">Invitation Unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This setup link is invalid, expired, or already used.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Back to Login
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
