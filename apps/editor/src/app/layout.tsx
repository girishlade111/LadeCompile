import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, themeInlineScript } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "LadeCompile — Free Online HTML/CSS/JS Editor",
  description:
    "Fast, free, and distraction-free HTML, CSS, and JavaScript online editor with instant live preview and zero setup. Part of LadeStack.",
  metadataBase: new URL("https://compile.ladestack.in"),
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const webUrl =
    process.env.NEXT_PUBLIC_WEB_URL ||
    (process.env.NODE_ENV === "development" ? "http://localhost:4321" : "");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;475;500;600&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: themeInlineScript }} />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-background font-sans antialiased text-foreground"
      >
        <ThemeProvider>
          <TooltipProvider>
            {/* Global navigation header matching Airtable top-nav specification */}
            <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background px-6 lg:px-12">
              <div className="flex items-center gap-8">
                <a href={`${webUrl}/`} className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#181d26] dark:bg-white text-[12px] font-bold tracking-wider text-white dark:text-[#181d26]">
                    LC
                  </span>
                  <span className="text-[16px] font-medium tracking-tight text-foreground">LadeCompile</span>
                  <span className="hidden rounded-[4px] border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-muted-foreground sm:inline-flex">
                    LADESTACK
                  </span>
                </a>

                <nav className="hidden md:flex items-center gap-6 text-[14px] font-normal text-muted-foreground">
                  <a href={`${webUrl}/`} className="transition-colors hover:text-foreground">
                    Home
                  </a>
                  <a href={`${webUrl}/#features`} className="transition-colors hover:text-foreground">
                    Features
                  </a>
                  <a href={`${webUrl}/#starters`} className="transition-colors hover:text-foreground">
                    Templates
                  </a>
                  <a href={`${webUrl}/blog`} className="transition-colors hover:text-foreground">
                    Blog
                  </a>
                </nav>
              </div>

              <div className="flex items-center gap-4 text-[14px]">
                <a href={`${webUrl}/blog`} className="md:hidden font-medium text-muted-foreground hover:text-foreground">
                  Blog
                </a>
                <a
                  href="https://ladestack.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:inline-flex items-center text-[13px] font-medium text-muted-foreground hover:text-foreground"
                >
                  LadeStack ↗
                </a>
                <a
                  href={`${webUrl}/`}
                  className="inline-flex items-center justify-center rounded-[12px] border border-border bg-background px-3.5 py-1.5 text-[13px] font-medium text-foreground hover:bg-muted/60 transition-colors"
                >
                  Overview
                </a>
              </div>
            </header>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
