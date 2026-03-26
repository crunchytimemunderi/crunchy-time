/**
 * In-memory rate limiter using sliding window approach.
 * Suitable for single-instance deployments (Vercel serverless).
 * For multi-instance deployments, use Redis-backed rate limiting.
 */

import { NextRequest } from "next/server";

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

/**
 * Get client IP from request headers.
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxAttempts: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check if a request is within rate limits.
 *
 * @example
 * ```ts
 * const result = checkRateLimit(request, "login", { maxAttempts: 5, windowMs: 2 * 60 * 1000 });
 * if (!result.allowed) {
 *   return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
 * }
 * ```
 */
export function checkRateLimit(
  request: NextRequest,
  prefix: string,
  config: RateLimitConfig
): RateLimitResult {
  const { maxAttempts, windowMs } = config;
  const ip = getClientIP(request);
  const key = `${prefix}:${ip}`;
  const now = Date.now();
  const cutoff = now - windowMs;

  // Periodic cleanup
  cleanup(windowMs);

  // Get or create entry
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxAttempts) {
    // Rate limited
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, retryAfterMs),
    };
  }

  // Allow and record
  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxAttempts - entry.timestamps.length,
    retryAfterMs: 0,
  };
}

/**
 * Helper to create a 429 Too Many Requests response.
 */
export function rateLimitResponse(retryAfterMs: number) {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retryAfterSeconds: retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}
