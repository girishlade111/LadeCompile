import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, themeInlineScript } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "LadeCompile — Free HTML CSS JS Editor",
  description:
    "Free, no-login, enterprise-grade HTML/CSS/JS online compiler — write, preview, and share code instantly. Part of LadeStack.",
  metadataBase: new URL("https://compile.ladestack.in"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInlineScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <TooltipProvider>
            {/* Minimal header placeholder — full top bar comes in Prompt 13 */}
            <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background/80 px-4 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#6366f1] text-[11px] font-extrabold tracking-widest text-white">
                  LC
                </span>
                <span className="text-sm font-bold tracking-tight">LadeCompile</span>
                <span className="hidden rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-widest text-muted-foreground sm:inline-flex">
                  LADESTACK
                </span>
              </div>
              <span className="ml-auto text-xs text-muted-foreground">Editor scaffold — Prompt 4</span>
            </header>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
