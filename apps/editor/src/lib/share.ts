import LZString from "lz-string";
import { DEFAULT_FILES, type EditorFile } from "./editorDefaults";

/**
 * URL length threshold above which state should be saved to Cloudflare KV
 * instead of encoding in the URL hash fragment.
 * ~2000 chars is the practical cross-browser URL length limit.
 */
export const URL_HASH_LENGTH_THRESHOLD = 2000;

/** Max allowed payload size in bytes for KV share requests (500 KB) */
export const MAX_SHARE_PAYLOAD_BYTES = 500 * 1024;

export interface SharePayload {
  "index.html": string;
  "styles.css": string;
  "script.js": string;
}

/**
 * Encodes all 3 editor files into a single compressed, URL-safe string.
 */
export function encodeShareState(files: Record<EditorFile, string>): string {
  const payload: SharePayload = {
    "index.html": files["index.html"] ?? "",
    "styles.css": files["styles.css"] ?? "",
    "script.js": files["script.js"] ?? "",
  };

  const json = JSON.stringify(payload);
  return LZString.compressToEncodedURIComponent(json);
}

/**
 * Decompresses and validates a URL-safe encoded share string.
 * Returns the 3 files if valid, or null if corrupted/malformed.
 */
export function decodeShareState(encoded: string): Record<EditorFile, string> | null {
  if (!encoded || typeof encoded !== "string") {
    return null;
  }

  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) {
      return null;
    }

    const parsed = JSON.parse(decompressed);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    // Must be an object with string values for at least one of the files
    const result: Record<EditorFile, string> = {
      "index.html": typeof parsed["index.html"] === "string" ? parsed["index.html"] : DEFAULT_FILES["index.html"],
      "styles.css": typeof parsed["styles.css"] === "string" ? parsed["styles.css"] : DEFAULT_FILES["styles.css"],
      "script.js": typeof parsed["script.js"] === "string" ? parsed["script.js"] : DEFAULT_FILES["script.js"],
    };

    return result;
  } catch (err) {
    console.warn("[LadeCompile] Failed to decode shared code payload:", err);
    return null;
  }
}

/**
 * Determines whether the encoded state exceeds the safe URL length threshold.
 */
export function shouldUseKvFallback(encodedString: string, currentUrlPrefix = ""): boolean {
  // Approximate full URL length: prefix + "#code=" + encodedString
  const estimatedUrlLength = currentUrlPrefix.length + 6 + encodedString.length;
  return estimatedUrlLength > URL_HASH_LENGTH_THRESHOLD || encodedString.length > URL_HASH_LENGTH_THRESHOLD;
}

/**
 * Generates a cryptographically random, collision-resistant alphanumeric short ID.
 * Default 8 characters (~218 trillion permutations in Base62).
 */
export function generateShortId(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback if crypto is unavailable
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}
