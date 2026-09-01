import Link from "next/link";

export default function NotFound() {
  const webUrl =
    process.env.NEXT_PUBLIC_WEB_URL ||
    (process.env.NODE_ENV === "development" ? "http://localhost:4321" : "");

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center p-6 text-center bg-background">
      <div className="rounded-[12px] border border-border bg-card p-8 max-w-md shadow-xs">
        <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          404 Not Found
        </span>
        <h1 className="mt-2 text-[24px] font-medium text-foreground">Page Not Found</h1>
        <p className="mt-3 text-[14px] text-muted-foreground leading-relaxed">
          The requested page is part of the marketing site or does not exist in the editor.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href={`${webUrl}/`}
            className="inline-flex items-center justify-center rounded-[12px] border border-border bg-background px-4 py-2 text-[14px] font-medium text-foreground hover:bg-muted"
          >
            Go to Marketing Home
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-[12px] bg-primary px-4 py-2 text-[14px] font-medium text-primary-foreground hover:bg-primary/90"
          >
            Open Web Editor
          </Link>
        </div>
      </div>
    </div>
  );
}
