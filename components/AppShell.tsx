import Link from "next/link";
import { Activity, AlertTriangle, GitPullRequest } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ServerSession } from "@/lib/auth/server";

type Props = {
  session: ServerSession;
  activeNav?: "incidents" | "workflow-requests";
  children: React.ReactNode;
};

const navItems = [
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/workflow-requests", label: "Workflow Requests", icon: GitPullRequest }
] as const;

export function AppShell({ session, activeNav, children }: Props): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
        <div className="flex w-full items-center gap-6">
          <Link href="/incidents" className="flex items-center gap-2 text-foreground">
            <Activity className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">N8N Monitor</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activeNav ? item.href.includes(activeNav) : false;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
                {session.username.charAt(0).toUpperCase()}
              </div>
              <div className="hidden flex-col sm:flex">
                <span className="text-xs font-medium text-foreground">{session.username}</span>
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wider",
                    session.role === "ADMIN" ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {session.role}
                </span>
              </div>
            </div>
            <LogoutButton iconOnly />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 lg:p-6">{children}</main>
    </div>
  );
}
