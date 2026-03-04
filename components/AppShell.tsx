import { LogoutButton } from "@/components/LogoutButton";
import { ServerSession } from "@/lib/auth/server";

type Props = {
  session: ServerSession;
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
  title,
  subtitle,
  topRightActions,
  children
}: Props): JSX.Element {
  return (
    <div className="dashboard-wrap">
      <section className="dashboard-main">
        <header className="topbar">
          <div className="stack" style={{ gap: 4 }}>
            <h1>{title}</h1>
            {subtitle ? <p className="muted">{subtitle}</p> : null}
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
