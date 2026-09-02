import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { generateShortId, MAX_SHARE_PAYLOAD_BYTES, type SharePayload } from "@/lib/share";
import { DEFAULT_FILES, type EditorFile } from "@/lib/editorDefaults";

export const dynamic = "force-dynamic";

/** 30 days in seconds for Cloudflare KV TTL */
const SHARE_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Rate limit: 20 shares per hour per IP */
const RATE_LIMIT_MAX_PER_HOUR = 20;
const RATE_LIMIT_WINDOW_SECONDS = 3600;

// In-memory fallback caches for local development when KV is not bound
const devStorage = new Map<string, { value: string; expiresAt: number }>();
const devRateLimits = new Map<string, { count: number; expiresAt: number }>();

async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    return (ctx.env as CloudflareEnv) || null;
  } catch {
    try {
      const ctx = getCloudflareContext();
      return (ctx.env as CloudflareEnv) || null;
    } catch {
      return null;
    }
  }
}

function getClientIp(req: NextRequest): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const xForwarded = req.headers.get("x-forwarded-for");
  if (xForwarded) {
    const first = xForwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "127.0.0.1";
}

async function checkAndIncrementRateLimit(ip: string, env: CloudflareEnv | null): Promise<boolean> {
  const hourBucket = Math.floor(Date.now() / (RATE_LIMIT_WINDOW_SECONDS * 1000));
  const rateLimitKey = `ratelimit:share:${ip}:${hourBucket}`;

  if (env?.SHARE_KV) {
    try {
      const currentVal = await env.SHARE_KV.get(rateLimitKey);
      const count = currentVal ? parseInt(currentVal, 10) : 0;
      if (count >= RATE_LIMIT_MAX_PER_HOUR) {
        return false;
      }
      await env.SHARE_KV.put(rateLimitKey, String(count + 1), {
        expirationTtl: RATE_LIMIT_WINDOW_SECONDS + 60,
      });
      return true;
    } catch (e) {
      console.warn("[LadeCompile] KV rate-limit error, falling back to memory:", e);
    }
  }

  // In-memory rate-limit fallback
  const now = Date.now();
  const entry = devRateLimits.get(rateLimitKey);
  if (entry && entry.expiresAt > now) {
    if (entry.count >= RATE_LIMIT_MAX_PER_HOUR) {
      return false;
    }
    entry.count += 1;
    return true;
  }

  devRateLimits.set(rateLimitKey, {
    count: 1,
    expiresAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000,
  });
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const env = await getCloudflareEnv();
    const clientIp = getClientIp(req);

    // 1. Rate-limiting check
    const allowed = await checkAndIncrementRateLimit(clientIp, env);
    if (!allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Maximum 20 share links per hour per IP. Please try again later.",
        },
        { status: 429 }
      );
    }

    // 2. Validate payload size
    const rawBody = await req.text();
    if (rawBody.length > MAX_SHARE_PAYLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `Payload too large. Maximum allowed size is ${MAX_SHARE_PAYLOAD_BYTES / 1024} KB.`,
        },
        { status: 413 }
      );
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!parsedBody || typeof parsedBody !== "object") {
      return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
    }

    const bodyObj = parsedBody as Record<string, unknown>;
    const files = (bodyObj.files ?? bodyObj) as Partial<Record<EditorFile, unknown>>;

    if (
      typeof files !== "object" ||
      files === null ||
      (typeof files["index.html"] !== "string" &&
        typeof files["styles.css"] !== "string" &&
        typeof files["script.js"] !== "string")
    ) {
      return NextResponse.json(
        { error: "Invalid payload format. Must contain index.html, styles.css, or script.js strings." },
        { status: 400 }
      );
    }

    const payload: SharePayload = {
      "index.html": typeof files["index.html"] === "string" ? files["index.html"] : DEFAULT_FILES["index.html"],
      "styles.css": typeof files["styles.css"] === "string" ? files["styles.css"] : DEFAULT_FILES["styles.css"],
      "script.js": typeof files["script.js"] === "string" ? files["script.js"] : DEFAULT_FILES["script.js"],
    };

    const shortId = generateShortId(8);
    const storageKey = `share:${shortId}`;
    const valueToStore = JSON.stringify({
      ...payload,
      createdAt: Date.now(),
    });

    if (env?.SHARE_KV) {
      try {
        await env.SHARE_KV.put(storageKey, valueToStore, {
          expirationTtl: SHARE_TTL_SECONDS,
        });
      } catch (kvErr) {
        console.error("[LadeCompile] Failed to write to Cloudflare KV:", kvErr);
        // Save to in-memory fallback if KV fails
        devStorage.set(storageKey, {
          value: valueToStore,
          expiresAt: Date.now() + SHARE_TTL_SECONDS * 1000,
        });
      }
    } else {
      devStorage.set(storageKey, {
        value: valueToStore,
        expiresAt: Date.now() + SHARE_TTL_SECONDS * 1000,
      });
    }

    return NextResponse.json(
      {
        success: true,
        id: shortId,
        shareUrl: `/editor?share=${shortId}`,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[LadeCompile] POST /api/share uncaught error:", err);
    return NextResponse.json({ error: "Internal server error while generating share link." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || searchParams.get("share");

    if (!id || typeof id !== "string" || !/^[a-zA-Z0-9_-]{4,64}$/.test(id)) {
      return NextResponse.json({ error: "Missing or invalid share ID." }, { status: 400 });
    }

    const storageKey = `share:${id}`;
    const env = await getCloudflareEnv();
    let rawData: string | null = null;

    if (env?.SHARE_KV) {
      try {
        rawData = await env.SHARE_KV.get(storageKey);
      } catch (kvErr) {
        console.warn("[LadeCompile] Failed to read from Cloudflare KV:", kvErr);
      }
    }

    // Fallback to dev memory storage if not found in KV or KV not configured
    if (!rawData) {
      const entry = devStorage.get(storageKey);
      if (entry && entry.expiresAt > Date.now()) {
        rawData = entry.value;
      }
    }

    if (!rawData) {
      return NextResponse.json({ error: "Shared code snippet not found or expired." }, { status: 404 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawData);
    } catch {
      return NextResponse.json({ error: "Corrupted share data." }, { status: 500 });
    }

    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ error: "Invalid share data format." }, { status: 500 });
    }

    const p = parsed as Record<string, unknown>;
    const files: Record<EditorFile, string> = {
      "index.html": typeof p["index.html"] === "string" ? p["index.html"] : DEFAULT_FILES["index.html"],
      "styles.css": typeof p["styles.css"] === "string" ? p["styles.css"] : DEFAULT_FILES["styles.css"],
      "script.js": typeof p["script.js"] === "string" ? p["script.js"] : DEFAULT_FILES["script.js"],
    };

    return NextResponse.json({
      success: true,
      id,
      files,
    });
  } catch (err) {
    console.error("[LadeCompile] GET /api/share uncaught error:", err);
    return NextResponse.json({ error: "Internal server error while fetching share data." }, { status: 500 });
  }
}
