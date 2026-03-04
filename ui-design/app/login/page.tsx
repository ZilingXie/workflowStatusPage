"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-mock-auth"
import { Activity } from "lucide-react"

export default function LoginPage() {
  const { login, user, isLoading } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/incidents")
    }
  }, [isLoading, user, router])

  if (!isLoading && user) {
    return null
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    setTimeout(() => {
      const result = login(username, password)
      if (result.success) {
        router.push("/incidents")
      } else {
        setError(result.error || "Login failed")
        setIsSubmitting(false)
      }
    }, 400)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Activity className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">
              N8N Workflow Monitor
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to manage workflow incidents
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-sm font-medium text-foreground">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="h-10 rounded-md border border-input bg-input/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Demo Accounts</p>
          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Admin:</span>
              <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground">admin / admin123</code>
            </div>
            <div className="flex items-center justify-between">
              <span>Operator:</span>
              <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-foreground">operator / operator123</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
