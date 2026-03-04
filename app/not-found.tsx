import Link from "next/link";

export default function NotFoundPage(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-foreground">Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The requested incident does not exist.</p>
        <Link
          href="/incidents"
          className="mt-4 inline-flex rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          Back to incidents
        </Link>
      </div>
    </main>
  );
}
