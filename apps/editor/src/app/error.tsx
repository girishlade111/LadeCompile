"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the full error for observability, but never render error.message / stack to the UI.
    console.error("[LadeCompile] Unhandled runtime error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-col items-center justify-center overflow-hidden bg-background p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Mock console/terminal window — token-based, theme-aware (light & dark) */}
        <div className="overflow-hidden rounded-[12px] border border-border bg-card shadow-xs">
          <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" aria-hidden="true" />
            <span className="ml-2 truncate font-mono text-[12px] text-muted-foreground">
              console — ladecompile
            </span>
          </div>
          <div className="overflow-x-auto px-4 py-4 font-mono text-[12.5px] leading-relaxed sm:px-5">
            <p className="text-muted-foreground">// Unhandled runtime exception</p>
            <p>
              <span className="text-primary">throw new</span>{" "}
              <span className="text-destructive">UnexpectedError</span>
              <span className="text-foreground">(</span>
              <span className="text-[#1a7f37] dark:text-[#7ee787]">&quot;Something went wrong — 500&quot;</span>
              <span className="text-foreground">);</span>
            </p>
            <p className="mt-2 text-muted-foreground">
              Your local code and storage are preserved. No action needed on your end.
            </p>
            {error.digest && (
              <p className="mt-2 text-[11px] text-muted-foreground/70">
                Error digest: <span className="text-foreground">{error.digest}</span>
              </p>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2 font-mono text-[11px] text-muted-foreground">
            <span>
              HTTP <span className="font-semibold text-foreground">500</span> · Runtime Error
            </span>
            <span>UTF-8</span>
          </div>
        </div>

        {/* Human-readable messaging */}
        <h1 className="mt-6 text-center text-[22px] font-medium tracking-tight text-foreground sm:text-[24px]">
          Something went wrong.
        </h1>
        <p className="mt-2 text-center text-[14px] leading-relaxed text-muted-foreground">
          An unexpected error occurred in the editor. Your work is safe — try again, or head back to
          the editor.
        </p>

        {/* Actions — reset() retries the failed segment; 44px+ touch targets */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try Again
          </button>
          <Link
            href="/editor"
            className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] border border-border bg-background px-5 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            Back to Editor
          </Link>
        </div>
      </div>
    </div>
  );
}
