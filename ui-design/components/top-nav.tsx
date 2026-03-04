"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-mock-auth"
import { useTheme } from "@/hooks/use-theme"
import { Activity, LogOut, AlertTriangle, GitPullRequest, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/workflow-requests", label: "Workflow Requests", icon: GitPullRequest },
]

export function TopNav() {
  const { user, logout, isAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()

  function handleLogout() {
    logout()
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      <div className="flex w-full items-center gap-6">
        {/* Logo */}
        <Link href="/incidents" className="flex items-center gap-2 text-foreground">
          <Activity className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">N8N Monitor</span>
        </Link>

        {/* Nav Links */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
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
            )
          })}
        </nav>

        {/* User Info */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {user && (
            <>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden flex-col sm:flex">
                  <span className="text-xs font-medium text-foreground">
                    {user.displayName}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-medium uppercase tracking-wider",
                      isAdmin ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
