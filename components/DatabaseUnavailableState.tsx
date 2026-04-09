import { AlertTriangle } from "lucide-react";
import Link from "next/link";

type DatabaseUnavailableStateProps = {
  title: string;
  description: string;
  retryHref: string;
  backHref?: string;
  backLabel?: string;
};

export function DatabaseUnavailableState({
  title,
  description,
  retryHref,
  backHref,
  backLabel
}: DatabaseUnavailableStateProps): JSX.Element {
  return (
    <section className="rounded-lg border border-amber-500/30 bg-card p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/10">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={retryHref}
              className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Retry
            </Link>
            {backHref && backLabel ? (
              <Link
                href={backHref}
                className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {backLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
