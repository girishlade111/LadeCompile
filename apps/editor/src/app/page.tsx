import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

const MonacoTest = dynamic(() => import("@/components/editor/MonacoTest"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-xl border bg-muted/20 text-sm text-muted-foreground">
      Loading Monaco...
    </div>
  ),
});

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Editor scaffold — Prompt 4</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Tailwind + shadcn/ui + Monaco verified. This is a minimal test page that proves the editor renders,
          accepts input, and still deploys to Cloudflare Workers via OpenNext. Real tabs/preview/console come in Prompt 6.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          External route: <code className="rounded bg-muted px-1.5 py-0.5">/editor</code> → this Worker · Base layout + fonts/colors mirror{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">apps/web</code> (brand #6366f1, Inter).
        </p>
      </div>

      {/* Monaco — browser-only, dynamically imported */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground">MONACO TEST (client-only, ssr: false)</h2>
        <MonacoTest />
        <p className="mt-2 text-xs text-muted-foreground">Type in the editor above — changes are held in client state and don’t break the server build.</p>
      </section>

      {/* shadcn/ui demo */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground">SHADCN/UI DEMO</h2>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
          <Button>Default Button</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>shadcn/ui Dialog</DialogTitle>
                <DialogDescription>Dialog renders correctly in the editor scaffold.</DialogDescription>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">This confirms @radix-ui/react-dialog wiring.</p>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Dropdown</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => toast("JSZip / html2canvas / lz-string installed")}>Check future deps</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Second item</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Tooltip works</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button onClick={() => toast("Toast works — sonner installed")}>Show Toast</Button>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground">TABS + FUTURE DEPS</h2>
        <Tabs defaultValue="installed" className="w-full">
          <TabsList>
            <TabsTrigger value="installed">Installed</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
          </TabsList>
          <TabsContent value="installed" className="rounded-xl border p-4 text-sm leading-6">
            <ul className="list-disc pl-5 text-muted-foreground">
              <li>
                <code className="rounded bg-muted px-1">tailowindcss</code> + <code className="rounded bg-muted px-1">@tailwindcss/postcss</code> — mirrors
                <code className="rounded bg-muted px-1">apps/web</code> brand #6366f1 / Inter.
              </li>
              <li>
                <code className="rounded bg-muted px-1">@monaco-editor/react</code> — dynamically imported with <code className="rounded bg-muted px-1">ssr: false</code>
              </li>
              <li>
                <code className="rounded bg-muted px-1">jszip</code> — for Prompt 11 ZIP export
              </li>
              <li>
                <code className="rounded bg-muted px-1">html2canvas</code> — for screenshot export
              </li>
              <li>
                <code className="rounded bg-muted px-1">lz-string</code> — for URL-hash compression
              </li>
              <li>shadcn/ui: button, dialog, dropdown-menu, tabs, tooltip, toast (sonner)</li>
            </ul>
          </TabsContent>
          <TabsContent value="tokens" className="rounded-xl border p-4 text-sm leading-6 text-muted-foreground">
            Fonts: Inter, ui-sans-serif fallback. Colors: brand #6366f1 / #5456e5 / #eef0ff, zinc palette via CSS variables
            (<code className="rounded bg-muted px-1">--background</code>, <code className="rounded bg-muted px-1">--foreground</code> etc.) — shared with Astro homepage.
          </TabsContent>
        </Tabs>
      </section>

      <p className="text-xs text-muted-foreground">
        No editor tabs, preview, or console yet — scaffolding only. Folder <code className="rounded bg-muted px-1">src/app/editor/</code> and{" "}
        <code className="rounded bg-muted px-1">src/components/editor/</code> exist for Prompt 6. <code className="rounded bg-muted px-1">src/lib/</code> holds{" "}
        <code className="rounded bg-muted px-1">cn()</code> and will host URL-encoding helpers.
      </p>
    </main>
  );
}
