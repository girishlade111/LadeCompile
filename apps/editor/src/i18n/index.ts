/**
 * Message loading layer for apps/editor with English fallback.
 * Requirement §5: fallback happens at load layer, not per-component.
 *
 * Two entry-points:
 *  - Server/build: import messages statically (e.g. in middleware/layout.tsx)
 *  - Client (EditorShell): dynamic import via loadMessages(locale)
 */

import type { Locale } from "./locales";
import { DEFAULT_LOCALE } from "./locales";

import enMessages from "../../messages/en.json";

type Messages = Record<string, unknown>;

const EN_MESSAGES = enMessages as unknown as Messages;
const cache = new Map<string, Messages>();

function deepMergeWithFallback(base: Messages, target: Messages): Messages {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(target)) {
    if (
      v !== null && typeof v === "object" && !Array.isArray(v) &&
      base[k] !== null && typeof base[k] === "object" && !Array.isArray(base[k])
    ) {
      out[k] = deepMergeWithFallback(base[k] as Messages, v as Messages);
    } else {
      out[k] = v as unknown;
    }
  }
  return out;
}

export async function loadMessages(locale: Locale): Promise<Messages> {
  const key = locale;
  if (cache.has(key)) return cache.get(key)!;
  if (locale === DEFAULT_LOCALE) {
    cache.set(key, EN_MESSAGES);
    return EN_MESSAGES;
  }
  try {
    const mod = await import(`../../messages/${locale}.json`);
    const loaded = (mod.default ?? mod) as Messages;
    const merged = deepMergeWithFallback(EN_MESSAGES, loaded);
    cache.set(key, merged);
    return merged;
  } catch {
    cache.set(key, EN_MESSAGES);
    return EN_MESSAGES;
  }
}

/** Synchronous fallback-aware resolver (for already-cached or English). */
export function tSync(
  messages: Messages,
  key: string,
  params?: Record<string, string | number>
): string {
  return t(messages, key, params);
}

export function getByPath(messages: Messages, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/** Translate dotted key, falling back to English if missing, then to key itself. */
export function t(
  messages: Messages,
  key: string,
  params?: Record<string, string | number>
): string {
  let value = getByPath(messages, key);
  if (value === undefined) {
    value = getByPath(EN_MESSAGES, key);
  }
  if (value === undefined) return key;
  let str = String(value);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

/** Cookie helpers — shared name with apps/web (Path=/). */
export const LOCALE_COOKIE_NAME = "ladecompile_locale";

export function getLocaleFromCookie(cookieHeader: string | null): Locale | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${LOCALE_COOKIE_NAME}=`));
  if (!match) return null;
  const raw = match.slice(LOCALE_COOKIE_NAME.length + 1).toLowerCase();
  const SUPPORTED: string[] = ["en", "zh", "pt-br", "ru", "ja", "tr", "ko"];
  if ((SUPPORTED as string[]).includes(raw)) return raw as Locale;
  return null;
}
