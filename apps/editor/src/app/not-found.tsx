import type { Metadata } from "next";
import Link from "next/link";
import { normalizeLocale, localePath } from "@/i18n/locales";

// Error pages should never be indexed.
export const metadata: Metadata = {
  title: "404 — Page Not Found | LadeCompile",
  robots: { index: false, follow: false },
};

"use client";
export default function NotFound() {
  const webUrl =
    process.env.NEXT_PUBLIC_WEB_URL ||
    (process.env.NODE_ENV === "development" ? "http://localhost:4321" : "https://compile.ladestack.in");
  const getLocale = () => {
    if (typeof window === "undefined") return "en";
    const segs = window.location.pathname.split("/").filter(Boolean);
    const maybeLocale = segs[0]?.toLowerCase();
    const supported = ["en", "zh", "pt-br", "ru", "ja", "tr", "ko"];
    return supported.includes(maybeLocale) ? maybeLocale : "en";
  };
  const loc = normalizeLocale(getLocale());
  const editorHref = localePath(loc, "/editor");
  const homeHref = `${webUrl}${localePath(loc, "/")}`;

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
            <p className="text-muted-foreground">// Uncaught at route resolution</p>
            <p>
              <span className="text-primary">console</span>
              <span className="text-foreground">.</span>
              <span className="text-primary">error</span>
              <span className="text-foreground">(</span>
              <span className="text-[#1a7f37] dark:text-[#7ee787]">&quot;Error: Page not found — 404&quot;</span>
              <span className="text-foreground">);</span>
            </p>
            <p className="mt-2 text-muted-foreground">
              Uncaught <span className="text-destructive">NotFoundError</span>
              : The requested page does not exist.
            </p>
            <p className="mt-2 text-muted-foreground">
              <span className="text-muted-foreground">// Suggested fix:</span>{" "}
              <span className="text-primary">return</span>{" "}
              <span className="text-foreground">/editor</span>
              <span className="text-foreground">;</span>
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2 font-mono text-[11px] text-muted-foreground">
            <span>
              HTTP <span className="font-semibold text-foreground">404</span> · Not Found
            </span>
            <span>UTF-8</span>
          </div>
        </div>

        {/* Human-readable messaging */}
        <h1 className="mt-6 text-center text-[22px] font-medium tracking-tight text-foreground sm:text-[24px]">
          This page couldn&apos;t compile.
        </h1>
        <p className="mt-2 text-center text-[14px] leading-relaxed text-muted-foreground">
          The page you&apos;re looking for was moved, renamed, or never existed. Your saved code in the
          editor is untouched.
        </p>

        {/* Actions — 44px+ touch targets */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={editorHref}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to Editor
          </Link>
          <a
            href={homeHref}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] border border-border bg-background px-5 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            Marketing Homepage
          </a>
        </div>
      </div>
    </div>
  );
}
