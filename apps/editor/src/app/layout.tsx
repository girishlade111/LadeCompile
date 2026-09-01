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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <script dangerouslySetInnerHTML={{ __html: themeInlineScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <TooltipProvider>
            {/* Global navigation header */}
            <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="flex items-center gap-3">
                <a href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#6366f1] text-[11px] font-extrabold tracking-widest text-white shadow-sm">
                    LC
                  </span>
                  <span className="text-sm font-bold tracking-tight">LadeCompile</span>
                </a>
                <span className="hidden rounded-full border bg-muted/30 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-muted-foreground sm:inline-flex">
                  LADESTACK
                </span>
              </div>
              <nav className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                <a href="/" className="transition-colors hover:text-foreground">
                  Home
                </a>
                <a href="/blog" className="transition-colors hover:text-foreground">
                  Blog
                </a>
                <a
                  href="https://ladestack.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden transition-colors hover:text-foreground md:inline-block"
                >
                  LadeStack Ecosystem ↗
                </a>
              </nav>
            </header>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
