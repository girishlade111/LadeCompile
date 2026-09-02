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
  Menu,
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
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { SUPPORTED_LOCALES, LOCALE_LABELS, type Locale, normalizeLocale } from "@/i18n/locales";
import enMessages from "../../../messages/en.json";
import zhMessages from "../../../messages/zh.json";
import ptBrMessages from "../../../messages/pt-br.json";
import ruMessages from "../../../messages/ru.json";
import jaMessages from "../../../messages/ja.json";
import trMessages from "../../../messages/tr.json";
import koMessages from "../../../messages/ko.json";

const MESSAGES_MAP: Record<string, Record<string, unknown>> = {
  en: enMessages as unknown as Record<string, unknown>,
  zh: zhMessages as unknown as Record<string, unknown>,
  "pt-br": ptBrMessages as unknown as Record<string, unknown>,
  ru: ruMessages as unknown as Record<string, unknown>,
  ja: jaMessages as unknown as Record<string, unknown>,
  tr: trMessages as unknown as Record<string, unknown>,
  ko: koMessages as unknown as Record<string, unknown>,
};
import { TEMPLATES, type Template } from "@/lib/templates";
import { encodeShareState, decodeShareState, shouldUseKvFallback } from "@/lib/share";
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

export default function EditorShell({ initialLocale, initialMessages }: { initialLocale?: string; initialMessages?: Record<string, unknown> } = {}) {
  const normalizedLocale = (initialLocale ? normalizeLocale(initialLocale) : "en") as Locale;
  const [locale] = useState<Locale>(normalizedLocale);
  const [messages, setMessages] = useState<Record<string, unknown>>(
    (initialMessages as Record<string, unknown>) ?? (enMessages as unknown as Record<string, unknown>)
  );
  useEffect(() => {
    // If server already provided correct locale messages, don't reload
    if (initialMessages) {
      setMessages(initialMessages as Record<string, unknown>);
      return;
    }
    if (locale === "en") {
      setMessages(enMessages as unknown as Record<string, unknown>);
      return;
    }
    import(`../../../messages/${locale}.json`).then((mod) => {
      const loaded = (mod.default ?? mod) as Record<string, unknown>;
      // deep merge fallback to en
      function merge(base: any, target: any): any {
        const out: any = { ...base };
        for (const k of Object.keys(target)) {
          if (target[k] && typeof target[k] === "object" && !Array.isArray(target[k]) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) {
            out[k] = merge(base[k], target[k]);
          } else {
            out[k] = target[k];
          }
        }
        return out;
      }
      setMessages(merge(enMessages, loaded));
    }).catch(() => setMessages(enMessages as unknown as Record<string, unknown>));
  }, [locale, initialMessages]);
  const tr = (key: string, params?: Record<string, string|number>) => {
    const parts = key.replace(/\[(\d+)\]/g, ".$1").split(".");
    let cur: any = messages;
    for (const pp of parts) {
      if (cur == null || typeof cur !== "object") { cur = undefined; break; }
      cur = cur[pp];
    }
    let val: any = cur;
    if (val === undefined) {
      // fallback to en
      let fallback: any = enMessages as any;
      for (const pp of parts) {
        if (fallback == null || typeof fallback !== "object") { fallback = undefined; break; }
        fallback = fallback[pp];
      }
      val = fallback;
    }
    if (val === undefined) return key;
    let str = String(val);
    if (params) for (const [k,v] of Object.entries(params)) str = str.replaceAll(`{${k}}`, String(v));
    return str;
  };
  const [consoleOpen, setConsoleOpen] = useState(true);
  const { theme, setTheme, toggleTheme } = useTheme();
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

  // Mobile viewport message dismissal state
  const [dismissMobileWarning, setDismissMobileWarning] = useState(false);

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

  // ---- Responsive layout state (additive; desktop >=1024px unaffected) ----
  // Mobile: <768px -> stacked Code/Preview/Console panels. Tablet-down: <1024px -> drawer rail.
  const [isMobile, setIsMobile] = useState(false);
  const [isTabletDown, setIsTabletDown] = useState(false);
  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const drawerQuery = window.matchMedia("(max-width: 1023px)");
    const update = () => {
      setIsMobile(mobileQuery.matches);
      setIsTabletDown(drawerQuery.matches);
    };
    update();
    mobileQuery.addEventListener("change", update);
    drawerQuery.addEventListener("change", update);
    return () => {
      mobileQuery.removeEventListener("change", update);
      drawerQuery.removeEventListener("change", update);
    };
  }, []);

  // Slide-out drawer state (replaces left icon rail below lg)
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => {
    if (!isTabletDown) setDrawerOpen(false);
  }, [isTabletDown]);

  // Mobile panel switcher: Code / Preview / Console
  const [mobileView, setMobileView] = useState<"code" | "preview" | "console">("code");

  // Mobile defaults: no minimap (toggle stays in Settings), readable font size without zoom
  const effectiveMinimap = minimapEnabled && !isMobile;
  const effectiveFontSize = isMobile ? Math.max(fontSize, 14) : fontSize;

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
        typeof window !== "undefined" && window.location.pathname.includes("/editor")
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
    const toastId = toast.loading("Generating ZIP archive...");
    try {
      const current = getCurrentFilesForExport();
      const { default: JSZip } = await import("jszip");
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
      toast.success("ZIP downloaded", { id: toastId, description: "LadeCompile-export.zip — 3 files" });
    } catch (e) {
      console.error("[LadeCompile] ZIP export error:", e);
      toast.error("ZIP download failed", { id: toastId, description: String(e) });
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
        toast.error("Screenshot capture failed — preview may contain external content", {
          description: String(e),
        });
        return;
      }
      const toastId = toast.loading(`Capturing preview as ${format.toUpperCase()}...`);
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
        toast.success(`Screenshot downloaded as ${ext.toUpperCase()}`, {
          id: toastId,
          description: "LadeCompile-preview." + ext,
        });
      } catch (e) {
        console.error("[LadeCompile] Screenshot error:", e);
        toast.error("Screenshot capture failed", {
          id: toastId,
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

  // Set font size preference and persist to localStorage
  const handleSetFontSize = useCallback((size: number) => {
    setFontSize(size);
    try {
      localStorage.setItem("ladecompile:editor:fontSize:v1", String(size));
    } catch (e) {
      console.warn("[LadeCompile] Failed to persist font size preference:", e);
    }
    toast.success(`Font size: ${size}px`);
  }, []);

  // Search in editor action (triggers Monaco find widget)
  const handleSearchClick = useCallback(() => {
    if (editorRef.current) {
      try {
        editorRef.current.focus();
        const action = editorRef.current.getAction("actions.find");
        if (action) {
          action.run();
        } else {
          editorRef.current.trigger("keyboard", "actions.find", null);
        }
      } catch (e) {
        console.warn("[LadeCompile] Search trigger error:", e);
      }
    } else {
      toast.info("Editor is loading...");
    }
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
        const apiEndpoint = pathname.includes("/editor") ? "/editor/api/share" : "/api/share";
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

  // Shared preview iframe (single source of truth — used by desktop split-pane and mobile panel;
  // only one is ever mounted at a time so previewRef stays valid)
  const previewFrame = (
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
  );

  // Shared console log body (desktop split-pane + mobile console panel)
  const consoleLogBody = (
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
  );

  return (
    <TooltipProvider>
      {/* Mobile viewport barrier (< 768px) */}
      {!dismissMobileWarning && (
        <div className="flex md:hidden h-[calc(100vh-3.5rem)] min-h-[460px] w-full flex-col items-center justify-center bg-background p-6 text-center">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-4 rounded-xl border bg-card/60 p-6 shadow-lg backdrop-blur">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#6366f1]/10 text-[#6366f1]">
              <Monitor className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-bold tracking-tight text-foreground">Desktop Experience Recommended</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                LadeCompile works best on a larger screen. Switch to desktop or rotate your tablet to landscape mode for multi-tab code editing and live preview.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 pt-2">
              <Button asChild size="sm" className="w-full bg-[#6366f1] text-xs hover:bg-[#5456e5]">
                <a href="/">Back to Homepage</a>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setDismissMobileWarning(true)}
              >
                Continue to Mobile Editor
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main editor workspace */}
      <div className={cn("h-[calc(100vh-3.5rem)] min-h-[540px] overflow-hidden bg-background", !dismissMobileWarning ? "hidden md:flex" : "flex")}>
        {/* Mobile/tablet slide-out drawer — replaces the left icon rail below lg */}
        {isTabletDown && drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Files menu">
            <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
            <div className="absolute inset-y-0 left-0 flex w-64 max-w-[80vw] flex-col border-r bg-background shadow-xl">
              <div className="flex h-10 shrink-0 items-center justify-between border-b px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>{tr("drawer.title")}</span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-0.5 overflow-y-auto p-2">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {tr("explorer.projectFiles")}
                </div>
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.name;
                  return (
                    <button
                      key={tab.name}
                      onClick={() => {
                        handleTabSwitch(tab.name);
                        setDrawerOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-xs font-medium transition-colors",
                        isActive
                          ? "bg-accent font-semibold text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <tab.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#6366f1]" : "text-muted-foreground")} />
                      <span className="truncate">{tab.name}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-auto space-y-0.5 border-t p-2">
                <div className="px-2 py-1"><LanguageSwitcher currentLocale={locale} /></div>
                <button
                  onClick={() => {
                    handleSearchClick();
                    setDrawerOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <Search className="h-4 w-4 shrink-0" /> Search
                </button>
                <button
                  onClick={() => {
                    setTemplatesOpen(true);
                    setDrawerOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <LayoutTemplate className="h-4 w-4 shrink-0" /> Templates
                </button>
                <button
                  onClick={() => {
                    setSettingsOpen(true);
                    setDrawerOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <Settings className="h-4 w-4 shrink-0" /> Settings
                </button>
                <button
                  onClick={toggleTheme}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
                  {isDark ? tr("drawer.lightTheme") : tr("drawer.darkTheme")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Left icon rail */}
        <aside className="hidden w-12 shrink-0 flex-col items-center justify-between border-r bg-muted/20 py-3 dark:bg-zinc-900/40 lg:flex">
          <div className="flex flex-col items-center gap-1">
            <IconButton
              icon={Files}
              label={tr("explorer.title")}
              active={explorerOpen}
              onClick={() => setExplorerOpen((prev) => !prev)}
            />
            <IconButton
              icon={Search}
              label={tr("explorer.searchHint")}
              onClick={handleSearchClick}
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <IconButton
              icon={Settings}
              label={tr("explorer.settings")}
              active={settingsOpen}
              onClick={() => setSettingsOpen(true)}
            />
          </div>
        </aside>

        {/* Explorer collapsible sidebar */}
        {explorerOpen && (
          <aside className="flex w-48 shrink-0 flex-col border-r bg-muted/10 dark:bg-zinc-900/30">
            <div className="flex h-10 items-center justify-between border-b px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>{tr("explorer.title")}</span>
              <button
                onClick={() => setExplorerOpen(false)}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close Explorer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-0.5 p-2">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {tr("explorer.projectFiles")}
              </div>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.name;
                return (
                  <button
                    key={tab.name}
                    onClick={() => handleTabSwitch(tab.name)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <tab.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#6366f1]" : "text-muted-foreground")} />
                    <span className="truncate">{tab.name}</span>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <div className="flex h-10 shrink-0 items-center justify-between border-b bg-background px-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs font-medium">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                HTML
              </span>
              <span className="hidden text-xs text-muted-foreground sm:inline">{tr("topbar.badge")}</span>
            </div>
            <div className="flex items-center gap-1">
              <LanguageSwitcher currentLocale={locale} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden h-7 w-7 sm:inline-flex"
                    aria-label={tr("topbar.templates")}
                    onClick={() => setTemplatesOpen(true)}
                  >
                    <LayoutTemplate className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tr("topbar.templates")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    className="h-7 gap-1 bg-[#6366f1] px-3 text-xs hover:bg-[#5456e5]"
                    onClick={handleRun}
                    aria-label={tr("topbar.run")}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Run
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tr("topbar.run")}</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="hidden h-7 w-7 sm:inline-flex" aria-label={tr("topbar.moreOptions")}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{tr("topbar.moreOptions")}</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={handleFormatCode}>
                    <Code2 className="mr-2 h-4 w-4" />
                    {tr("moreMenu.formatCode")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleResetToDefault}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {tr("moreMenu.resetToDefault")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked={minimapEnabled} onCheckedChange={handleToggleMinimap}>
                    <Map className="mr-2 h-4 w-4" />
                    {tr("moreMenu.minimap")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
                    <Keyboard className="mr-2 h-4 w-4" />
                    {tr("moreMenu.keyboardShortcuts")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="mx-1 hidden h-4 w-px bg-border sm:block" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden h-7 w-7 sm:inline-flex"
                    aria-label={tr("topbar.toggleTheme")}
                    onClick={toggleTheme}
                  >
                    {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tr("topbar.toggleTheme")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden h-7 w-7 sm:inline-flex" aria-label={tr("topbar.save")} onClick={handleSave}>
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tr("topbar.save")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden h-7 w-7 sm:inline-flex"
                    aria-label={tr("topbar.share")}
                    onClick={handleShare}
                    disabled={isSharing}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tr("topbar.share")}</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="hidden h-7 w-7 sm:inline-flex" aria-label={tr("topbar.export")}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{tr("topbar.export")}</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{tr("moreMenu.export")}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleDownloadZip}>
                    <FileArchive className="mr-2 h-4 w-4" />
                    {tr("export.downloadZip")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleCopyActive}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy {activeTab}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyCombined}>
                    <FileText className="mr-2 h-4 w-4" />
                    {tr("export.copyCombined")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      {tr("export.screenshot")}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-48">
                      <DropdownMenuItem onClick={() => handleScreenshot("png")}>{tr("export.screenshotPng")}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleScreenshot("jpeg")}>{tr("export.screenshotJpeg")}</DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Mobile overflow menu — collapses Save/Share/Export/Templates/More into "..." */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:hidden" aria-label={tr("topbar.moreOptions")}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setTemplatesOpen(true)}>
                    <LayoutTemplate className="mr-2 h-4 w-4" />
                    Templates
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShare} disabled={isSharing}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadZip}>
                    <FileArchive className="mr-2 h-4 w-4" />
                    {tr("export.downloadZip")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyActive}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy {activeTab}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
                    <Keyboard className="mr-2 h-4 w-4" />
                    {tr("moreMenu.keyboardShortcuts")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleTheme}>
                    {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                    {isDark ? tr("drawer.lightTheme") : tr("drawer.darkTheme")}
                  </DropdownMenuItem>
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
                    "flex h-full items-center gap-1.5 border-r px-2 text-[11px] font-medium transition-colors sm:px-3 sm:text-xs",
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

          {/* Main split — desktop/tablet split-pane (unchanged at >=768px) */}
          {!isMobile && (
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
                      minimap={effectiveMinimap}
                      fontSize={effectiveFontSize}
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
                    {consoleOpen ? consoleLogBody : null}
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
                  <div className="flex flex-1 bg-white dark:bg-zinc-950">{previewFrame}</div>
                </div>
              </Panel>
            </PanelGroup>
          </div>
          )}

          {/* Mobile stacked panels — Code / Preview / Console (< 768px) */}
          {isMobile && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex h-9 shrink-0 items-stretch border-b bg-muted/30" role="tablist" aria-label="Editor panels">
                {(["code", "preview", "console"] as const).map((mv) => (
                  <button
                    key={mv}
                    role="tab"
                    aria-selected={mobileView === mv}
                    onClick={() => {
                      setMobileView(mv);
                      if (mv === "console") setConsoleOpen(true);
                    }}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 border-r text-xs font-medium capitalize transition-colors last:border-r-0",
                      mobileView === mv
                        ? "border-t-2 border-t-[#6366f1] bg-background text-foreground"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    {mv === "code" ? (
                      <FileCode className="h-3.5 w-3.5" />
                    ) : mv === "preview" ? (
                      <Monitor className="h-3.5 w-3.5" />
                    ) : (
                      <Terminal className="h-3.5 w-3.5" />
                    )}
                    {mv}
                    {mv === "console" && mobileView !== "console" && unreadCount > 0 && (
                      <span className="inline-flex min-w-[16px] justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1">
                {/* All three panels stay mounted so editor state / iframe / console survive tab switches */}
                <div className={cn("h-full", mobileView !== "code" && "hidden")}>
                  <CodeEditor
                    path={activeTab}
                    language={LANGUAGE_MAP[activeTab]}
                    value={files[activeTab]}
                    theme={theme}
                    minimap={effectiveMinimap}
                    fontSize={effectiveFontSize}
                    touchMode
                    onMount={handleEditorMount}
                    onChange={handleEditorChange}
                  />
                </div>
                <div className={cn("flex h-full flex-col bg-muted/5", mobileView !== "preview" && "hidden")}>
                  <div className="flex h-9 shrink-0 items-center justify-between border-b bg-muted/20 px-3">
                    <span className="text-xs font-semibold">Preview</span>
                    <span className="text-[11px] text-muted-foreground">sandboxed iframe · Run to refresh</span>
                  </div>
                  <div className="flex flex-1 bg-white dark:bg-zinc-950">{previewFrame}</div>
                </div>
                <div className={cn("flex h-full flex-col bg-background", mobileView !== "console" && "hidden")}>
                  <div className="flex h-9 shrink-0 items-center justify-between border-b bg-muted/20 px-3">
                    <span className="flex items-center gap-1.5 text-xs font-semibold">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Console
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Clear console" onClick={clearConsole}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {consoleLogBody}
                </div>
              </div>
            </div>
          )}

          {/* Status bar */}
          <div className="flex h-6 shrink-0 items-center justify-between border-t bg-[#6366f1] px-3 text-[11px] font-medium text-white dark:bg-[#4f52e0]">
            <button
              onClick={toggleTheme}
              aria-label={tr("topbar.toggleTheme")}
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
        <DialogContent className="sm:max-h-[80vh] sm:max-w-3xl overflow-hidden p-0">
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
        <DialogContent className="sm:max-w-md">
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
        <DialogContent className="sm:max-w-md">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tr("save.resetConfirmTitle")}</DialogTitle>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-[#6366f1]" />
              {tr("shortcuts.title")}
            </DialogTitle>
            <DialogDescription>
              {tr("shortcuts.description")}
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

      {/* Settings / Preferences Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-[#6366f1]" />
              Preferences
            </DialogTitle>
            <DialogDescription>
              Customize your editor workspace and appearance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-xs">
            {/* Theme selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  className={cn("h-9 gap-1.5 text-xs", theme === "light" && "bg-[#6366f1] text-white hover:bg-[#5456e5]")}
                  onClick={() => setTheme("light")}
                >
                  <Sun className="h-3.5 w-3.5" />
                  Light
                </Button>
                <Button
                  type="button"
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  className={cn("h-9 gap-1.5 text-xs", theme === "dark" && "bg-[#6366f1] text-white hover:bg-[#5456e5]")}
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="h-3.5 w-3.5" />
                  Dark
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs"
                  onClick={() => {
                    const isSystemDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
                    setTheme(isSystemDark ? "dark" : "light");
                    toast.success("Theme set to system default");
                  }}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  System
                </Button>
              </div>
            </div>

            {/* Minimap toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-foreground">{tr("settings.minimap")}</div>
                <div className="text-[11px] text-muted-foreground">{tr("settings.minimapDescription")}</div>
              </div>
              <Button
                type="button"
                variant={minimapEnabled ? "default" : "outline"}
                size="sm"
                className={cn("h-8 text-xs", minimapEnabled && "bg-[#6366f1] text-white hover:bg-[#5456e5]")}
                onClick={handleToggleMinimap}
              >
                {minimapEnabled ? tr("settings.minimapEnabled") : tr("settings.minimapDisabled")}
              </Button>
            </div>

            {/* Font size selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Editor Font Size</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Small (12px)", size: 12 },
                  { label: "Medium (13px)", size: 13 },
                  { label: "Large (16px)", size: 16 },
                ].map((opt) => (
                  <Button
                    key={opt.size}
                    type="button"
                    variant={fontSize === opt.size ? "default" : "outline"}
                    size="sm"
                    className={cn("h-9 text-xs", fontSize === opt.size && "bg-[#6366f1] text-white hover:bg-[#5456e5]")}
                    onClick={() => handleSetFontSize(opt.size)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
