import { UserRole } from "@prisma/client";
import { Plus, Shield, UserCog } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireServerSession } from "@/lib/auth/server";
import { listUserAccounts } from "@/lib/auth/users";

export default async function AccountsPage(): Promise<JSX.Element> {
  const session = requireServerSession();

  if (session.role !== UserRole.ADMIN) {
    redirect("/incidents");
  }

  const accounts = await listUserAccounts();
  const adminCount = accounts.filter((account) => account.role === UserRole.ADMIN).length;
  const operatorCount = accounts.length - adminCount;

  return (
    <AppShell session={session} activeNav="accounts">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Accounts</h1>
            <p className="text-sm text-muted-foreground">
              Admin can view all accounts and manage OPERATOR account lifecycle.
            </p>
          </div>
          <Link
            href="/accounts/new"
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Account
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="Total Accounts"
            value={accounts.length}
            borderColor="border-blue-500/20"
            bgColor="bg-blue-500/10"
            icon={<UserCog className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          />
          <KpiCard
            label="Admin"
            value={adminCount}
            borderColor="border-emerald-500/20"
            bgColor="bg-emerald-500/10"
            icon={<Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
          />
          <KpiCard
            label="Operator"
            value={operatorCount}
            borderColor="border-amber-500/20"
            bgColor="bg-amber-500/10"
            icon={<UserCog className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
          />
        </div>

        <section className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            Admin bootstrap account should be created manually in database table <code>user_accounts</code>.
          </p>
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Created At (UTC)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Updated At (UTC)</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No account records found.
                    </td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id} className="border-b border-border/50 transition-colors hover:bg-secondary/20">
                      <td className="px-4 py-3 font-medium text-foreground">{account.username}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{account.email ?? "-"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{account.role}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {account.createdAt.toISOString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {account.updatedAt.toISOString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function KpiCard({
  label,
  value,
  borderColor,
  bgColor,
  icon
}: {
  label: string;
  value: number;
  borderColor: string;
  bgColor: string;
  icon: JSX.Element;
}): JSX.Element {
  return (
    <div className={`flex items-center gap-4 rounded-lg border bg-card p-4 ${borderColor}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
