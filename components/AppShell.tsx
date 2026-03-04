import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { ServerSession } from "@/lib/auth/server";

type Props = {
  session: ServerSession;
  activeNav?: "incidents" | "workflow-requests";
  title: string;
  subtitle?: string;
  topRightActions?: React.ReactNode;
  children: React.ReactNode;
};

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function AppShell({
  session,
  activeNav,
  title,
  subtitle,
  topRightActions,
  children
}: Props): JSX.Element {
  return (
    <div className="dashboard-wrap">
      <section className="dashboard-main">
        <header className="topbar">
          <div className="stack" style={{ gap: 8 }}>
            <h1>{title}</h1>
            {subtitle ? <p className="muted">{subtitle}</p> : null}
            <nav className="topbar-nav">
              <Link
                href="/incidents"
                className={activeNav === "incidents" ? "topbar-nav-link active" : "topbar-nav-link"}
              >
                Incidents
              </Link>
              <Link
                href="/workflow-requests"
                className={
                  activeNav === "workflow-requests" ? "topbar-nav-link active" : "topbar-nav-link"
                }
              >
                Workflow Requests
              </Link>
            </nav>
          </div>

          <div className="topbar-right">
            {topRightActions}
            <LogoutButton className="topbar-logout" />
            <div className="user-pill" title={`${session.username} (${session.role})`}>
              <span className="user-avatar">{initials(session.username)}</span>
              <div className="user-meta">
                <strong>{session.username}</strong>
                <span>{session.role}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="dashboard-content stack">{children}</main>
      </section>
    </div>
  );
}
