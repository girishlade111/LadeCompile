"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEFAULT_FILES, STORAGE_KEY, type EditorFile } from "@/lib/editorDefaults";

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
          // Only accept known keys and string values
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

  // Persist to localStorage debounced on files change (separate debounce from editor typing)
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
      // Store pending debounced update
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
    // Flush any pending edit for the previous tab before switching
    flushPending();
    setActiveTab(tab);
  };

  // Cleanup pending on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

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
              <Button size="sm" className="h-7 gap-1 bg-[#6366f1] px-3 text-xs hover:bg-[#5456e5]">
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

                  {/* Collapsible console — bottom of editor area */}
                  <div className={cn("shrink-0 border-t bg-background transition-all", consoleOpen ? "h-36" : "h-9")}>
                    <div className="flex h-9 items-center justify-between border-b bg-muted/20 px-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Console
                      </span>
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
                    {consoleOpen && (
                      <div className="flex h-[calc(100%-36px)] items-center justify-center bg-muted/10 p-3 text-xs text-muted-foreground">
                        <span>Console output will stream here in Prompt 8. Placeholder — no logic yet.</span>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
              <PanelResizeHandle className="w-1.5 bg-border transition-colors hover:bg-[#6366f1]/30 data-[resize-handle-state=drag]:bg-[#6366f1]/40" />
              <Panel defaultSize={45} minSize={25}>
                <div className="flex h-full flex-col bg-muted/5">
                  <div className="flex h-9 items-center border-b bg-muted/20 px-3 text-xs font-semibold">Preview</div>
                  <div className="flex flex-1 items-center justify-center p-4">
                    <div className="w-full max-w-sm rounded-xl border bg-white p-6 text-center shadow-sm dark:bg-zinc-900">
                      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-[#6366f1]/10 text-[#6366f1]">
                        <Play className="h-5 w-5" />
                      </div>
                      <p className="mt-3 text-sm font-semibold">Preview</p>
                      <p className="mt-1 text-xs text-muted-foreground">Live sandboxed preview will render here in Prompt 7.</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">Drag the divider to resize editor ↔ preview</p>
                    </div>
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
