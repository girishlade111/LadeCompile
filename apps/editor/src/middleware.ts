import { NextResponse, type NextRequest } from "next/server";

// Edge-compatible — no node:fs, node:path, or other Node-only APIs.
// This file runs on workerd via OpenNext/Cloudflare.

const SUPPORTED_LOCALES = ["en", "zh", "pt-br", "ru", "ja", "tr", "ko"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);

function parseLocaleFromPath(pathname: string): { locale: Locale; rest: string; hadPrefix: boolean } {
  const seg = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  if (seg && LOCALE_SET.has(seg)) {
    const locale = seg as Locale;
    // Strip "/{locale}" prefix
    const rest = pathname.slice(locale.length + 1) || "/";
    // Ensure rest starts with /
    const normalized = rest.startsWith("/") ? rest : `/${rest}`;
    return { locale, rest: normalized, hadPrefix: true };
  }
  return { locale: "en", rest: pathname, hadPrefix: false };
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // Bypass Next internals, static assets, API (API is locale-agnostic)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname.match(/\.(svg|png|jpg|jpeg|css|js|map|txt|xml|json|ico|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // API routes: handle locale-prefixed /{locale}/editor/api/share → /editor/api/share
  // Keep API locale-agnostic (no /ja prefix) but support locale-prefixed fetch via rewrite.
  if (pathname.includes("/api/")) {
    const { locale, rest, hadPrefix } = parseLocaleFromPath(pathname);
    if (hadPrefix && rest.includes("/editor/api/")) {
      const url2 = request.nextUrl.clone();
      url2.pathname = rest; // strip locale, e.g. /zh/editor/api/share → /editor/api/share
      const res = NextResponse.rewrite(url2);
      res.headers.set("x-ladecompile-locale", locale);
      res.cookies.set("ladecompile_locale", locale, { path: "/", maxAge: 31536000, sameSite: "lax", secure: true });
      return res;
    }
    const res = NextResponse.next();
    res.headers.set("x-ladecompile-locale", hadPrefix ? locale : "en");
    if (hadPrefix) {
      res.cookies.set("ladecompile_locale", locale, { path: "/", maxAge: 31536000, sameSite: "lax", secure: true });
    }
    return res;
  }

  const { locale, rest, hadPrefix } = parseLocaleFromPath(pathname);

  // Canonical redirect: /en/editor → /editor (unprefixed English is canonical)
  if (hadPrefix && locale === "en") {
    const redirectUrl = new URL(rest + url.search, request.url);
    // Preserve hash is client-only, cannot redirect hash from server
    const res = NextResponse.redirect(redirectUrl, 301);
    res.cookies.set("ladecompile_locale", "en", {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
      secure: true,
    });
    return res;
  }

  if (hadPrefix) {
    // For /{locale}/editor — set header + cookie, continue (do NOT rewrite basePath case).
    // With basePath "/editor", Next will handle "/{locale}/editor" as "/editor" after locale strip?
    // We keep original URL for [locale] routing (app/[locale]/editor) — so pass through with header.
    const res = NextResponse.next();
    res.headers.set("x-ladecompile-locale", locale);
    // Also set cookie for cross-app persistence (Path=/, readable by apps/web)
    res.cookies.set("ladecompile_locale", locale, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
      secure: true,
    });
    return res;
  }

  // No prefix — English default. Set header for downstream metadata.
  const res = NextResponse.next();
  res.headers.set("x-ladecompile-locale", "en");
  return res;
}

export const config = {
  // Match all editor routes including locale-prefixed variants.
  // With basePath "/editor", matcher sees paths like "/editor" and "/zh/editor" (locale outside basePath).
  matcher: [
    "/",
    "/editor/:path*",
    "/zh/editor/:path*",
    "/pt-br/editor/:path*",
    "/ru/editor/:path*",
    "/ja/editor/:path*",
    "/tr/editor/:path*",
    "/ko/editor/:path*",
    "/en/editor/:path*",
    "/zh/:path*",
    "/pt-br/:path*",
    "/ru/:path*",
    "/ja/:path*",
    "/tr/:path*",
    "/ko/:path*",
    "/en/:path*",
  ],
};
