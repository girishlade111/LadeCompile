"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[LadeCompile] Unhandled runtime error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] w-full flex-col items-center justify-center bg-background p-6 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border bg-card/80 p-8 shadow-lg backdrop-blur">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold tracking-tight text-foreground">Something went wrong</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            An unexpected error occurred in the editor. Your local code and storage are preserved.
          </p>
          {error.digest && (
            <p className="font-mono text-[10px] text-muted-foreground/60">
              Error Digest: {error.digest}
            </p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 pt-2 sm:flex-row">
          <Button
            type="button"
            className="flex-1 gap-2 bg-[#6366f1] text-xs hover:bg-[#5456e5]"
            onClick={() => reset()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </Button>
          <Button asChild variant="outline" className="flex-1 gap-2 text-xs">
            <a href="/">
              <Home className="h-3.5 w-3.5" />
              Homepage
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
