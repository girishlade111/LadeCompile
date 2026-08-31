"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Files,
  Search,
  Settings,
  Play,
  MoreVertical,
  Sun,
  Moon,
  Save,
  Share2,
  Download,
  X,
  ChevronUp,
  ChevronDown,
  FileCode,
  Palette,
  Braces,
  BookOpen,
  Terminal,
  AlertTriangle,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEFAULT_FILES, STORAGE_KEY, type EditorFile } from "@/lib/editorDefaults";
import { combineFiles } from "@/lib/preview";

// Dynamically import Monaco wrapper — browser only
const CodeEditor = dynamic(() => import("./CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading Monaco...</div>
  ),
});

const LANGUAGE_MAP: Record<EditorFile, string> = {
  "index.html": "html",
  "styles.css": "css",
  "script.js": "javascript",
};

type ConsoleEntry = {
  id: string;
  level: "log" | "warn" | "error";
  message: string;
  timestamp: number;
};

function IconButton({
  icon: Icon,
  label,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={label}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            active && "bg-accent text-accent-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function EditorShell() {
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorFile>("index.html");
  const [files, setFiles] = useState<Record<EditorFile, string>>(DEFAULT_FILES);

  // Console state
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const consoleContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const consoleOpenRef = useRef(consoleOpen);
  useEffect(() => {
    consoleOpenRef.current = consoleOpen;
    if (consoleOpen) setUnreadCount(0);
  }, [consoleOpen]);

  // Keep latest files in ref for flush on tab switch
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // Debounce refs for onChange
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ tab: EditorFile; value: string } | null>(null);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<EditorFile, string>>;
        if (parsed && typeof parsed === "object") {
          const next: Record<EditorFile, string> = { ...DEFAULT_FILES };
          let hasValid = false;
          (Object.keys(DEFAULT_FILES) as EditorFile[]).forEach((k) => {
            if (typeof parsed[k] === "string" && parsed[k]!.length > 0) {
              next[k] = parsed[k] as string;
              hasValid = true;
            }
          });
          if (hasValid) setFiles(next);
        }
      }
    } catch (e) {
      console.warn("[LadeCompile] Failed to read editor state from localStorage, using defaults", e);
    }
  }, []);

  // Persist to localStorage debounced on files change
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
      } catch (e) {
        console.warn("[LadeCompile] Failed to persist editor state to localStorage", e);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [files]);

  const flushPending = useCallback(() => {
    if (pendingRef.current) {
      const { tab, value } = pendingRef.current;
      pendingRef.current = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setFiles((prev) => ({ ...prev, [tab]: value }));
    } else if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const nextValue = value ?? "";
      pendingRef.current = { tab: activeTab, value: nextValue };
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (pendingRef.current) {
          const { tab, value: v } = pendingRef.current;
          pendingRef.current = null;
          timeoutRef.current = null;
          setFiles((prev) => ({ ...prev, [tab]: v }));
        }
      }, 400);
    },
    [activeTab]
  );

  const handleTabSwitch = (tab: EditorFile) => {
    flushPending();
    setActiveTab(tab);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Preview — derived from debounced files state (reuses same 400ms debounce)
  const previewHtml = useMemo(
    () => combineFiles(files["index.html"], files["styles.css"], files["script.js"]),
    [files]
  );
  const [previewRevision, setPreviewRevision] = useState(0);

  const clearConsole = useCallback(() => {
    setConsoleEntries([]);
    setUnreadCount(0);
  }, []);

  const handleRun = useCallback(() => {
    flushPending();
    // Clear console on each fresh run (matches OneCompiler fresh-console behavior)
    clearConsole();
    setPreviewRevision((v) => v + 1);
  }, [flushPending, clearConsole]);

  // Clear console automatically when preview re-renders (debounced files change)
  // This matches playgrounds that reset console per run
  useEffect(() => {
    // Don't clear on initial mount — only when files actually change after mount
    // Use a ref to skip first render
  }, []);

  // Actually clear on previewHtml change — but avoid clearing on initial mount
  const isFirstPreview = useRef(true);
  useEffect(() => {
    if (isFirstPreview.current) {
      isFirstPreview.current = false;
      return;
    }
    clearConsole();
    // Also reset unread if open
    if (consoleOpenRef.current) setUnreadCount(0);
  }, [previewHtml, clearConsole]);

  // postMessage bridge — parent side
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as unknown;
      if (!data || typeof data !== "object") return;
      const d = data as Record<string, unknown>;
      if (d.source !== "ladecompile-preview") return;
      if (d.type !== "console") return;
      const level = d.level as string;
      if (!["log", "warn", "error"].includes(level)) return;
      const message = typeof d.message === "string" ? d.message : String(d.message ?? "");
      const timestamp = typeof d.timestamp === "number" ? d.timestamp : Date.now();

      const entry: ConsoleEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        level: level as ConsoleEntry["level"],
        message: message.length > 2000 ? message.slice(0, 2000) + "… (truncated)" : message,
        timestamp,
      };

      setConsoleEntries((prev) => {
        const next = [...prev, entry];
        if (next.length > 500) return next.slice(-500);
        return next;
      });

      if (!consoleOpenRef.current) {
        setUnreadCount((c) => Math.min(c + 1, 99));
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Auto-scroll unless user scrolled up
  useEffect(() => {
    if (!consoleOpen) return;
    if (!isAtBottomRef.current) return;
    const el = consoleContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [consoleEntries, consoleOpen]);

  const handleConsoleScroll = () => {
    const el = consoleContainerRef.current;
    if (!el) return;
    const threshold = 24;
    isAtBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
  };

  const tabs: { name: EditorFile; icon: React.ComponentType<{ className?: string }> }[] = [
    { name: "index.html", icon: FileCode },
    { name: "styles.css", icon: Palette },
    { name: "script.js", icon: Braces },
  ];

  return (
    <TooltipProvider>
      <div className="flex h-[calc(100vh-3.5rem)] min-h-[540px] overflow-hidden bg-background">
        {/* Left icon rail */}
        <aside className="flex w-12 shrink-0 flex-col items-center justify-between border-r bg-muted/20 py-3 dark:bg-zinc-900/40">
          <div className="flex flex-col items-center gap-1">
            <IconButton icon={Files} label="Explorer" active />
            <IconButton icon={Search} label="Search" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <IconButton icon={Settings} label="Settings" />
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <div className="flex h-10 shrink-0 items-center justify-between border-b bg-background px-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs font-medium">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                HTML
              </span>
              <span className="hidden text-xs text-muted-foreground sm:inline">HTML / CSS / JS — no login required</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                className="h-7 gap-1 bg-[#6366f1] px-3 text-xs hover:bg-[#5456e5]"
                onClick={handleRun}
                aria-label="Run preview"
              >
                <Play className="h-3.5 w-3.5" />
                Run
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
                <MoreVertical className="h-4 w-4" />
              </Button>
              <div className="mx-1 h-4 w-px bg-border" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Toggle theme"
                    onClick={() => setIsDark((v) => !v)}
                  >
                    {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Theme</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Save">
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Share">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Export">
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex h-9 shrink-0 items-center gap-0 border-b bg-muted/30 px-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.name;
              return (
                <button
                  key={tab.name}
                  onClick={() => handleTabSwitch(tab.name)}
                  className={cn(
                    "flex h-full items-center gap-1.5 border-r px-3 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-background text-foreground border-t-2 border-t-[#6366f1]"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                  aria-selected={isActive}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.name}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className={cn(
                          "ml-1 flex h-4 w-4 cursor-not-allowed items-center justify-center rounded opacity-60",
                          isActive ? "text-muted-foreground" : "opacity-60"
                        )}
                        aria-label={`Close ${tab.name} (disabled)`}
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Fixed file structure</TooltipContent>
                  </Tooltip>
                </button>
              );
            })}
            <span className="ml-auto hidden pr-3 text-[11px] text-muted-foreground sm:inline">
              Monaco — {LANGUAGE_MAP[activeTab]} · debounced 400ms
            </span>
          </div>

          {/* Main split */}
          <div className="flex min-h-0 flex-1">
            <PanelGroup orientation="horizontal" className="flex-1">
              <Panel defaultSize={55} minSize={25} className="flex flex-col">
                {/* Editor area */}
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 bg-background">
                    <CodeEditor
                      path={activeTab}
                      language={LANGUAGE_MAP[activeTab]}
                      value={files[activeTab]}
                      onChange={handleEditorChange}
                    />
                  </div>

                  {/* Console */}
                  <div className={cn("flex shrink-0 flex-col border-t bg-background", consoleOpen ? "h-36" : "h-9")}>
                    <div className="flex h-9 shrink-0 items-center justify-between border-b bg-muted/20 px-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Console
                        {!consoleOpen && unreadCount > 0 && (
                          <span className="ml-1 inline-flex min-w-[18px] justify-center rounded-full bg-red-500 px-1 py-0.5 text-[10px] font-bold leading-none text-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          aria-label="Clear console"
                          onClick={clearConsole}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          aria-label={consoleOpen ? "Collapse console" : "Expand console"}
                          onClick={() => setConsoleOpen((v) => !v)}
                        >
                          {consoleOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                    {consoleOpen ? (
                      <div
                        ref={consoleContainerRef}
                        onScroll={handleConsoleScroll}
                        className="flex-1 overflow-y-auto bg-zinc-950 p-2 font-mono text-xs"
                      >
                        {consoleEntries.length === 0 ? (
                          <div className="flex h-full items-center justify-center text-zinc-500">
                            <span className="flex items-center gap-1.5">
                              <Terminal className="h-3.5 w-3.5" />
                              Console — Click Run to start · logs clear per run
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {consoleEntries.map((entry) => (
                              <div
                                key={entry.id}
                                className={cn(
                                  "flex gap-2 rounded px-1 py-0.5",
                                  entry.level === "error" && "bg-red-950/40 text-red-300",
                                  entry.level === "warn" && "bg-amber-950/30 text-amber-300",
                                  entry.level === "log" && "text-zinc-100"
                                )}
                              >
                                <span className="mt-0.5 shrink-0">
                                  {entry.level === "error" ? (
                                    <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                                  ) : entry.level === "warn" ? (
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                  ) : (
                                    <Terminal className="h-3.5 w-3.5 text-zinc-400" />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1 break-words whitespace-pre-wrap">{entry.message}</span>
                                <span className="shrink-0 text-[10px] text-zinc-500">
                                  {new Date(entry.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </Panel>
              <PanelResizeHandle className="w-1.5 bg-border transition-colors hover:bg-[#6366f1]/30 data-[resize-handle-state=drag]:bg-[#6366f1]/40" />
              <Panel defaultSize={45} minSize={25}>
                <div className="flex h-full flex-col bg-muted/5">
                  <div className="flex h-9 items-center justify-between border-b bg-muted/20 px-3">
                    <span className="text-xs font-semibold">Preview</span>
                    <span className="hidden text-[11px] text-muted-foreground sm:inline">sandboxed iframe · srcDoc — auto-updates after 400ms · Run to force</span>
                  </div>
                  <div className="flex flex-1 bg-white dark:bg-zinc-950">
                    <iframe
                      key={previewRevision}
                      title="Live preview"
                      srcDoc={previewHtml}
                      sandbox="allow-scripts allow-same-origin"
                      className="h-full w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </div>

          {/* Status bar */}
          <div className="flex h-6 shrink-0 items-center justify-between border-t bg-[#6366f1] px-3 text-[11px] font-medium text-white dark:bg-[#4f52e0]">
            <span className="flex items-center gap-1.5">
              <Sun className="h-3 w-3" />
              {isDark ? "Dark" : "Light"}
            </span>
            <a
              href="/blog"
              className="inline-flex items-center gap-1 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <BookOpen className="h-3 w-3" />
              Wiki / Docs
            </a>
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] tracking-wide">HTML</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
