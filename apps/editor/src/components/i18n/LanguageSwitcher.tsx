"use client";

import { useState, useEffect, useRef } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { SUPPORTED_LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/locales";

interface Props {
  currentLocale: Locale;
  className?: string;
}

function buildTargetHref(targetLocale: Locale, currentPathname: string, search: string, hash: string) {
  // currentPathname is like "/editor" or "/zh/editor" or "/editor?share=x" (without search/hash)
  // We need to swap only locale segment, preserve rest.
  // Supported forms: "/editor", "/editor/...", "/{locale}/editor", "/{locale}/editor/..."
  const supported = SUPPORTED_LOCALES as readonly string[];
  const segs = currentPathname.split("/").filter(Boolean); // ["zh","editor"] or ["editor"]
  let rest = "";
  const first = segs[0]?.toLowerCase();
  if (first && (supported as string[]).includes(first)) {
    // has locale prefix
    rest = "/" + segs.slice(1).join("/");
  } else {
    rest = currentPathname || "/editor";
    // Ensure rest starts with /editor
    if (!rest.includes("/editor")) rest = "/editor";
  }
  // rest is now "/editor" or "/editor/..."
  if (rest === "") rest = "/editor";
  const base = targetLocale === "en" ? rest : `/${targetLocale}${rest}`;
  return base + search + hash;
}

export default function LanguageSwitcher({ currentLocale, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const currentLabel = LOCALE_LABELS[currentLocale] ?? LOCALE_LABELS.en;

  const onSelect = (loc: Locale) => {
    if (typeof window === "undefined") return;
    const pathname = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash;
    const target = buildTargetHref(loc, pathname, search, hash);
    // Shared cookie Path=/, same-origin readable by apps/web and apps/editor
    document.cookie = `ladecompile_locale=${loc}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    try {
      localStorage.setItem("ladecompile:locale", loc);
    } catch {}
    // Do NOT touch STORAGE_KEY "ladecompile:editor:v1" — keep Monaco content intact
    // Do NOT clear localStorage autosave
    window.location.href = target;
  };

  return (
    <div ref={ref} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-[12px] border border-border bg-background px-2.5 py-1.5 text-[13px] font-medium text-foreground hover:bg-muted/60 transition-colors"
      >
        <Globe className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="hidden sm:inline">{currentLabel}</span>
        <span className="sm:hidden">{currentLocale.toUpperCase()}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Select language"
          className="absolute right-0 z-50 mt-2 max-h-72 w-56 overflow-auto rounded-[12px] border border-border bg-background py-1 shadow-lg"
        >
          {(SUPPORTED_LOCALES as readonly Locale[]).map((loc) => {
            const label = LOCALE_LABELS[loc];
            const isCurrent = loc === currentLocale;
            return (
              <li key={loc} role="presentation">
                <button
                  role="option"
                  aria-selected={isCurrent}
                  onClick={() => onSelect(loc)}
                  className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] hover:bg-muted/60 ${isCurrent ? "font-semibold text-foreground bg-muted/40" : "text-muted-foreground"}`}
                >
                  <span>{label}</span>
                  {isCurrent && <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
