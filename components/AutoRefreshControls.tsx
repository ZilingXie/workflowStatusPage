"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, RefreshCw } from "lucide-react";

type Props = {
  intervalMs: number;
};

export function AutoRefreshControls({ intervalMs }: Props): JSX.Element {
  const router = useRouter();
  const intervalSeconds = useMemo(() => Math.max(1, Math.round(intervalMs / 1000)), [intervalMs]);
  const [isActive, setIsActive] = useState(true);
  const [countdown, setCountdown] = useState(intervalSeconds);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.refresh();
          return intervalSeconds;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isActive, intervalSeconds, router]);

  useEffect(() => {
    setCountdown(intervalSeconds);
  }, [intervalSeconds]);

  function handleManualRefresh(): void {
    setCountdown(intervalSeconds);
    router.refresh();
  }

  function toggleActive(): void {
    setIsActive((prev) => !prev);
    setCountdown(intervalSeconds);
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5">
      <button
        type="button"
        onClick={toggleActive}
        className="h-auto min-h-0 border-0 bg-transparent p-0 text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground"
        title={isActive ? "Pause auto-refresh" : "Resume auto-refresh"}
      >
        {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <span className="min-w-[20px] text-center text-xs tabular-nums text-muted-foreground">
        {isActive ? `${countdown}s` : "Off"}
      </span>
      <button
        type="button"
        onClick={handleManualRefresh}
        className="h-auto min-h-0 border-0 bg-transparent p-0 text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground"
        title="Refresh now"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
