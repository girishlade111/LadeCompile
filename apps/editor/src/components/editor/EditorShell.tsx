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
  LayoutTemplate,
  Copy,
  FileArchive,
  Image as ImageIcon,
  FileText,
  RotateCcw,
  Code2,
  Map,
  Keyboard,
  Monitor,
} from "lucide-react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DEFAULT_FILES, STORAGE_KEY, type EditorFile } from "@/lib/editorDefaults";
import { combineFiles } from "@/lib/preview";
import { useTheme } from "@/components/theme-provider";
import { TEMPLATES, type Template } from "@/lib/templates";
import { encodeShareState, decodeShareState, shouldUseKvFallback } from "@/lib/share";
import JSZip from "jszip";
import { toast } from "sonner";

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

const TAB_MIME_MAP: Record<EditorFile, string> = {
  "index.html": "text/html",
  "styles.css": "text/css",
  "script.js": "text/javascript",
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
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={label}
          onClick={onClick}
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

function isEqualFiles(a: Record<EditorFile, string>, b: Record<EditorFile, string>) {
  return a["index.html"] === b["index.html"] && a["styles.css"] === b["styles.css"] && a["script.js"] === b["script.js"];
}

export default function EditorShell() {
  const [consoleOpen, setConsoleOpen] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [activeTab, setActiveTab] = useState<EditorFile>("index.html");
  const [files, setFiles] = useState<Record<EditorFile, string>>(DEFAULT_FILES);
  const [baselineFiles, setBaselineFiles] = useState<Record<EditorFile, string>>(DEFAULT_FILES);
  const previewRef = useRef<HTMLIFrameElement>(null);

  // Templates modal state
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Share state & overwrite confirmation
  const [isSharing, setIsSharing] = useState(false);
  const [shareConfirmOpen, setShareConfirmOpen] = useState(false);
  const [pendingShareFiles, setPendingShareFiles] = useState<Record<EditorFile, string> | null>(null);

  // Minimap preference state
  const [minimapEnabled, setMinimapEnabled] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ladecompile:editor:minimap:v1");
      if (saved !== null) {
        setMinimapEnabled(saved === "true");
      }
    } catch (e) {
      console.warn("[LadeCompile] Failed to read minimap preference:", e);
    }
  }, []);

  // Reset to default confirmation state
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Keyboard shortcuts dialog state
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Monaco editor reference
  const editorRef = useRef<any>(null);

  // Explorer sidebar & settings dialog state
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Font size preference state
  const [fontSize, setFontSize] = useState<number>(13);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ladecompile:editor:fontSize:v1");
      if (saved) {
        const n = parseInt(saved, 10);
        if (!isNaN(n) && n >= 10 && n <= 24) {
          setFontSize(n);
        }
      }
    } catch (e) {
      console.warn("[LadeCompile] Failed to read font size preference:", e);
    }
  }, []);

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

  // Rehydrate from localStorage & check URL for share state on mount
  useEffect(() => {
    let storedFiles: Record<EditorFile, string> | null = null;
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
          if (hasValid) {
            storedFiles = next;
          }
        }
      }
    } catch (e) {
      console.warn("[LadeCompile] Failed to read editor state from localStorage, using defaults", e);
    }

    const initialFiles = storedFiles || DEFAULT_FILES;
    const hasUnsavedCustomWork = storedFiles !== null && !isEqualFiles(storedFiles, DEFAULT_FILES);

    // Check URL hash for #code=
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    let hashCode: string | null = null;
    if (hash.startsWith("#code=")) {
      hashCode = hash.slice(6);
    } else if (hash.includes("code=")) {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      hashCode = params.get("code");
    }

    // Check URL query parameters for ?share= or ?id=
    const search = typeof window !== "undefined" ? window.location.search : "";
    const searchParams = new URLSearchParams(search);
    const shareId = searchParams.get("share") || searchParams.get("id");

    if (hashCode) {
      const decoded = decodeShareState(hashCode);
      if (!decoded) {
        toast.warning("Could not load shared code — showing default template");
        if (storedFiles) setFiles(storedFiles);
        return;
      }

      if (hasUnsavedCustomWork && !isEqualFiles(initialFiles, decoded)) {
        if (storedFiles) setFiles(storedFiles);
        setPendingShareFiles(decoded);
        setShareConfirmOpen(true);
      } else {
        setFiles(decoded);
        setBaselineFiles(decoded);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(decoded));
        } catch (e) {
          console.warn(e);
        }
        setActiveTab("index.html");
        toast.success("Loaded shared code", { description: "Restored code from share link" });
      }
    } else if (shareId) {
      const apiEndpoint =
        typeof window !== "undefined" && window.location.pathname.startsWith("/editor")
          ? `/editor/api/share?id=${encodeURIComponent(shareId)}`
          : `/api/share?id=${encodeURIComponent(shareId)}`;

      fetch(apiEndpoint)
        .then((res) => {
          if (!res.ok) throw new Error("Share link not found or expired");
          return res.json();
        })
        .then((data) => {
          if (data && data.files) {
            const loadedFiles: Record<EditorFile, string> = {
              "index.html": data.files["index.html"] ?? DEFAULT_FILES["index.html"],
              "styles.css": data.files["styles.css"] ?? DEFAULT_FILES["styles.css"],
              "script.js": data.files["script.js"] ?? DEFAULT_FILES["script.js"],
            };

            if (hasUnsavedCustomWork && !isEqualFiles(initialFiles, loadedFiles)) {
              if (storedFiles) setFiles(storedFiles);
              setPendingShareFiles(loadedFiles);
              setShareConfirmOpen(true);
            } else {
              setFiles(loadedFiles);
              setBaselineFiles(loadedFiles);
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedFiles));
              } catch (e) {
                console.warn(e);
              }
              setActiveTab("index.html");
              toast.success("Loaded shared code", { description: "Restored code from share link" });
            }
          } else {
            throw new Error("Invalid response format");
          }
        })
        .catch((err) => {
          console.warn("[LadeCompile] Failed to load share from KV:", err);
          toast.warning("Could not load shared code — showing default template");
          if (storedFiles) setFiles(storedFiles);
        });
    } else {
      if (storedFiles) {
        setFiles(storedFiles);
      }
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
    clearConsole();
    setPreviewRevision((v) => v + 1);
  }, [flushPending, clearConsole]);

  const isFirstPreview = useRef(true);
  useEffect(() => {
    if (isFirstPreview.current) {
      isFirstPreview.current = false;
      return;
    }
    clearConsole();
    if (consoleOpenRef.current) setUnreadCount(0);
  }, [previewHtml, clearConsole]);

  // Templates logic
  const getEffectiveFiles = useCallback((): Record<EditorFile, string> => {
    if (pendingRef.current) {
      return { ...filesRef.current, [pendingRef.current.tab]: pendingRef.current.value };
    }
    return filesRef.current;
  }, []);

  const applyTemplate = useCallback(
    (template: Template) => {
      const next: Record<EditorFile, string> = {
        "index.html": template.html,
        "styles.css": template.css,
        "script.js": template.js,
      };
      // Flush any pending edit first to avoid race
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      pendingRef.current = null;
      setFiles(next);
      setBaselineFiles(next);
      setActiveTab("index.html");
      setTemplatesOpen(false);
      setSearchQuery("");
      setPendingTemplate(null);
      setConfirmOpen(false);
      // Preview will auto-update via files → previewHtml, console clears via effect
    },
    []
  );

  const handleTemplateSelect = (template: Template) => {
    // Ensure pending typed content is considered
    const effective = getEffectiveFiles();
    const isDefault = isEqualFiles(effective, DEFAULT_FILES);
    const isBaseline = isEqualFiles(effective, baselineFiles);
    const needsConfirm = !isDefault && !isBaseline;
    if (needsConfirm) {
      setPendingTemplate(template);
      setConfirmOpen(true);
    } else {
      applyTemplate(template);
    }
  };

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return TEMPLATES;
    return TEMPLATES.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, Template[]> = {};
    for (const t of filteredTemplates) {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    }
    // Keep category order: Starters, Layouts, Components, Forms
    const order = ["Starters", "Layouts", "Components", "Forms"];
    return order
      .filter((cat) => groups[cat])
      .map((cat) => ({ category: cat, items: groups[cat] }))
      .concat(
        Object.keys(groups)
          .filter((cat) => !order.includes(cat))
          .map((cat) => ({ category: cat, items: groups[cat] }))
      );
  }, [filteredTemplates]);

  // Export — ZIP, Copy, Screenshot (all client-side)
  const getCurrentFilesForExport = useCallback((): Record<EditorFile, string> => {
    // Include pending typed content (flush not yet committed) so export reflects latest keystrokes
    if (pendingRef.current) {
      return { ...filesRef.current, [pendingRef.current.tab]: pendingRef.current.value };
    }
    return filesRef.current;
  }, []);

  const handleDownloadZip = useCallback(async () => {
    try {
      const current = getCurrentFilesForExport();
      const zip = new JSZip();
      zip.file("index.html", current["index.html"]);
      zip.file("styles.css", current["styles.css"]);
      zip.file("script.js", current["script.js"]);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "LadeCompile-export.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("ZIP downloaded", { description: "LadeCompile-export.zip — 3 files" });
    } catch (e) {
      console.error(e);
      toast.error("ZIP download failed", { description: String(e) });
    }
  }, [getCurrentFilesForExport]);

  const handleCopyActive = useCallback(async () => {
    // Flush pending so clipboard has latest active tab content
    let content: string;
    if (pendingRef.current && pendingRef.current.tab === activeTab) {
      content = pendingRef.current.value;
    } else {
      content = getCurrentFilesForExport()[activeTab];
    }
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard", { description: `${activeTab} — ${content.length} chars` });
    } catch (e) {
      console.error(e);
      toast.error("Copy failed — clipboard permission denied", { description: String(e) });
    }
  }, [activeTab, getCurrentFilesForExport]);

  const handleCopyCombined = useCallback(async () => {
    try {
      const current = getCurrentFilesForExport();
      const combined = combineFiles(current["index.html"], current["styles.css"], current["script.js"]);
      await navigator.clipboard.writeText(combined);
      toast.success("Copied combined HTML", { description: "Full preview document copied" });
    } catch (e) {
      console.error(e);
      toast.error("Copy failed — clipboard permission denied", { description: String(e) });
    }
  }, [getCurrentFilesForExport]);

  const handleScreenshot = useCallback(
    async (format: "png" | "jpeg") => {
      const iframe = previewRef.current;
      if (!iframe) {
        toast.error("Screenshot capture failed — preview not ready");
        return;
      }
      let target: HTMLElement | null = null;
      try {
        const doc = iframe.contentDocument;
        if (!doc) throw new Error("No contentDocument");
        target = doc.body;
        if (!target) throw new Error("No body in preview");
      } catch (e) {
        toast.error("Screenshot capture failed — preview may contain content that can't be captured", {
          description: String(e),
        });
        return;
      }
      try {
        const { default: html2canvas } = await import("html2canvas");
        const canvas = await html2canvas(target as HTMLElement, {
          backgroundColor: null,
          scale: 2,
          useCORS: true,
          allowTaint: false,
        } as unknown as Record<string, unknown>);
        const mime = format === "png" ? "image/png" : "image/jpeg";
        const ext = format === "png" ? "png" : "jpg";
        const dataUrl = canvas.toDataURL(mime, format === "jpeg" ? 0.92 : undefined);
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `LadeCompile-preview.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success(`Screenshot downloaded as ${ext.toUpperCase()}`, { description: "LadeCompile-preview." + ext });
      } catch (e) {
        console.error(e);
        toast.error("Screenshot capture failed — preview may contain content that can't be captured", {
          description: String(e),
        });
      }
    },
    []
  );

  // Apply shared code from link
  const applySharedFiles = useCallback((shared: Record<EditorFile, string>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingRef.current = null;
    setFiles(shared);
    setBaselineFiles(shared);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shared));
    } catch (e) {
      console.warn("[LadeCompile] Failed to persist shared code to localStorage:", e);
    }
    setActiveTab("index.html");
    setPendingShareFiles(null);
    setShareConfirmOpen(false);
    toast.success("Loaded shared code", { description: "Restored code from share link" });
  }, []);

  // Save to browser localStorage with toast confirmation
  const handleSave = useCallback(() => {
    flushPending();
    const current = getCurrentFilesForExport();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      setBaselineFiles(current);
      toast.success("Saved");
    } catch (e) {
      console.error("[LadeCompile] Save failed:", e);
      toast.error("Save failed", { description: String(e) });
    }
  }, [flushPending, getCurrentFilesForExport]);

  const handleSaveRef = useRef(handleSave);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  // Global keyboard shortcut Ctrl/Cmd + S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Monaco mount callback
  const handleEditorMount = useCallback((editorInstance: any, monaco: any) => {
    editorRef.current = editorInstance;
    if (monaco && editorInstance?.addCommand) {
      editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        handleSaveRef.current();
      });
    }
  }, []);

  // Format code using Monaco's built-in document formatter
  const handleFormatCode = useCallback(() => {
    if (editorRef.current) {
      try {
        const action = editorRef.current.getAction("editor.action.formatDocument");
        if (action) {
          action.run();
          toast.success("Code formatted");
        } else {
          toast.info("Formatting not available for this file");
        }
      } catch (e) {
        console.warn("[LadeCompile] Format error:", e);
      }
    } else {
      toast.info("Editor not ready for formatting");
    }
  }, []);

  // Reset to default action with unsaved changes confirmation
  const handleResetToDefault = useCallback(() => {
    const effective = getCurrentFilesForExport();
    const isDefault = isEqualFiles(effective, DEFAULT_FILES);
    if (isDefault) {
      toast.info("Already showing default starter template");
      return;
    }
    setResetConfirmOpen(true);
  }, [getCurrentFilesForExport]);

  const applyResetToDefault = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingRef.current = null;
    setFiles(DEFAULT_FILES);
    setBaselineFiles(DEFAULT_FILES);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FILES));
    } catch (e) {
      console.warn("[LadeCompile] Failed to reset localStorage:", e);
    }
    setActiveTab("index.html");
    setResetConfirmOpen(false);
    toast.success("Reset to default template");
  }, []);

  // Toggle Minimap and persist to localStorage
  const handleToggleMinimap = useCallback(() => {
    setMinimapEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("ladecompile:editor:minimap:v1", String(next));
      } catch (e) {
        console.warn("[LadeCompile] Failed to persist minimap preference:", e);
      }
      toast.success(next ? "Minimap enabled" : "Minimap disabled");
      return next;
    });
  }, []);

  // Share — URL hash (lz-string) for <= 2000 chars, KV fallback for large payloads
  const handleShare = useCallback(async () => {
    if (isSharing) return;
    const current = getCurrentFilesForExport();
    const encoded = encodeShareState(current);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const pathname = typeof window !== "undefined" ? window.location.pathname : "/editor";

    const needsKv = shouldUseKvFallback(encoded, origin + pathname);

    if (!needsKv) {
      // Primary path: URL-hash based sharing
      const shareUrl = `${origin}${pathname}#code=${encoded}`;
      try {
        window.history.replaceState(null, "", shareUrl);
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Share link copied to clipboard", {
          description: "URL-hash link copied — no login needed",
        });
      } catch {
        toast.success("Share link generated", {
          description: shareUrl,
        });
      }
    } else {
      // Secondary path: Cloudflare KV fallback for large payloads
      setIsSharing(true);
      const toastId = toast.loading("Generating share link...");
      try {
        const apiEndpoint = pathname.startsWith("/editor") ? "/editor/api/share" : "/api/share";
        const res = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: current }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Failed to generate share link.");
        }

        const shareUrl = `${origin}${pathname}?share=${data.id}`;
        window.history.replaceState(null, "", shareUrl);
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success("Share link copied to clipboard", {
            id: toastId,
            description: "Short link created via Cloudflare KV — no login needed",
          });
        } catch {
          toast.success("Share link generated", {
            id: toastId,
            description: shareUrl,
          });
        }
      } catch (err: unknown) {
        console.error("[LadeCompile] Share error:", err);
        const msg = err instanceof Error ? err.message : "Failed to create share link.";
        toast.error("Share failed", {
          id: toastId,
          description: msg,
        });
      } finally {
        setIsSharing(false);
      }
    }
  }, [isSharing, getCurrentFilesForExport]);

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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Templates"
                    onClick={() => setTemplatesOpen(true)}
                  >
                    <LayoutTemplate className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Templates</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    className="h-7 gap-1 bg-[#6366f1] px-3 text-xs hover:bg-[#5456e5]"
                    onClick={handleRun}
                    aria-label="Run"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Run
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Run</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>More options</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={handleFormatCode}>
                    <Code2 className="mr-2 h-4 w-4" />
                    Format Code
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleResetToDefault}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset to Default
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked={minimapEnabled} onCheckedChange={handleToggleMinimap}>
                    <Map className="mr-2 h-4 w-4" />
                    Minimap
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
                    <Keyboard className="mr-2 h-4 w-4" />
                    Keyboard Shortcuts
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="mx-1 h-4 w-px bg-border" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Toggle theme"
                    onClick={toggleTheme}
                  >
                    {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle theme</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Save" onClick={handleSave}>
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Share"
                    onClick={handleShare}
                    disabled={isSharing}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Export">
                        <Download className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Export</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Export</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleDownloadZip}>
                    <FileArchive className="mr-2 h-4 w-4" />
                    Download ZIP
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleCopyActive}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy {activeTab}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyCombined}>
                    <FileText className="mr-2 h-4 w-4" />
                    Copy combined HTML
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Screenshot
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-48">
                      <DropdownMenuItem onClick={() => handleScreenshot("png")}>Screenshot as PNG</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleScreenshot("jpeg")}>Screenshot as JPEG</DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
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
                      theme={theme}
                      minimap={minimapEnabled}
                      onMount={handleEditorMount}
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
                      ref={previewRef}
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
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex items-center gap-1.5 rounded px-1 hover:bg-white/20"
            >
              {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
              {isDark ? "Dark" : "Light"}
            </button>
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

      {/* Templates Library Dialog */}
      <Dialog open={templatesOpen} onOpenChange={(open) => { setTemplatesOpen(open); if (!open) setSearchQuery(""); }}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-[#6366f1]" />
              Templates Library
            </DialogTitle>
            <DialogDescription>Choose a starter — search by name, category, or description. Preview updates automatically.</DialogDescription>
          </DialogHeader>
          <div className="px-6 pt-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                placeholder="Search templates (e.g. landing, flexbox, form...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="max-h-[50vh] overflow-y-auto px-6 pb-6 pt-4">
            {filteredTemplates.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No templates match “{searchQuery}”.</p>
            ) : (
              <div className="space-y-6">
                {groupedTemplates.map(({ category, items }) => (
                  <div key={category}>
                    <h3 className="mb-2 text-xs font-bold tracking-widest text-muted-foreground">{category.toUpperCase()}</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {items.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleTemplateSelect(t)}
                          className="text-left rounded-xl border bg-card p-4 hover:border-[#6366f1]/50 hover:shadow-sm transition"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold">{t.name}</span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold tracking-wide text-muted-foreground">
                              {t.category}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground line-clamp-2">{t.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes confirmation for Templates */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Replace your current code?</DialogTitle>
            <DialogDescription>
              This will replace your current HTML, CSS, and JavaScript with “{pendingTemplate?.name}”. Your current edits will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setConfirmOpen(false); setPendingTemplate(null); }}>
              Cancel
            </Button>
            <Button
              className="bg-[#6366f1] hover:bg-[#5456e5]"
              onClick={() => {
                if (pendingTemplate) applyTemplate(pendingTemplate);
              }}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes confirmation for Shared Code */}
      <Dialog open={shareConfirmOpen} onOpenChange={setShareConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Replace your current code?</DialogTitle>
            <DialogDescription>
              Loading this shared code will replace your current work. Continue?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShareConfirmOpen(false);
                setPendingShareFiles(null);
                toast.info("Shared code not loaded — kept your current work");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#6366f1] hover:bg-[#5456e5]"
              onClick={() => {
                if (pendingShareFiles) applySharedFiles(pendingShareFiles);
              }}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset to Default confirmation dialog */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset to default?</DialogTitle>
            <DialogDescription>
              This will replace your current HTML, CSS, and JavaScript with the default starter template. Your current edits will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setResetConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#6366f1] hover:bg-[#5456e5]"
              onClick={applyResetToDefault}
            >
              Reset
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-[#6366f1]" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Quick reference for editor and navigation keyboard shortcuts.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1 text-xs">
            <div>
              <h4 className="mb-2 font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                General & Actions
              </h4>
              <div className="space-y-1.5 rounded-lg border bg-muted/20 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-foreground">Save code</span>
                  <kbd className="inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                    Ctrl / ⌘ + S
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground">Format document</span>
                  <kbd className="inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                    Shift + Alt + F
                  </kbd>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                Search & Navigation
              </h4>
              <div className="space-y-1.5 rounded-lg border bg-muted/20 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-foreground">Find</span>
                  <kbd className="inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                    Ctrl / ⌘ + F
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground">Replace</span>
                  <kbd className="inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                    Ctrl / ⌘ + H
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground">Go to Line</span>
                  <kbd className="inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                    Ctrl / ⌘ + G
                  </kbd>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                Code Editing
              </h4>
              <div className="space-y-1.5 rounded-lg border bg-muted/20 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-foreground">Toggle Line Comment</span>
                  <kbd className="inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                    Ctrl / ⌘ + /
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground">Select Next Match</span>
                  <kbd className="inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                    Ctrl / ⌘ + D
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground">Move Line Up / Down</span>
                  <kbd className="inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                    Alt + ↑ / ↓
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground">Copy Line Up / Down</span>
                  <kbd className="inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                    Shift + Alt + ↑ / ↓
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground">Undo / Redo</span>
                  <kbd className="inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                    Ctrl / ⌘ + Z / Y
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
