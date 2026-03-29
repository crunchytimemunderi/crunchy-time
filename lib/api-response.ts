import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/utils/supabase/admin";

type ApiSuccessData = Record<string, unknown> | unknown[];

/**
 * Centralized API response utilities.
 * Ensures consistent JSON shapes and status codes across all API routes.
 */
export const apiResponse = {
  /**
   * 200 OK with JSON data.
   */
  ok<T extends ApiSuccessData>(data: T) {
    return NextResponse.json(data, { status: 200 });
  },

  /**
   * 400 Bad Request.
   */
  badRequest(message: string) {
    return NextResponse.json({ error: message }, { status: 400 });
  },

  /**
   * 401 Unauthorized.
   */
  unauthorized(message = "Unauthorized") {
    return NextResponse.json({ error: message }, { status: 401 });
  },

  /**
   * 403 Forbidden.
   */
  forbidden(message = "Forbidden - Admin access required") {
    return NextResponse.json({ error: message }, { status: 403 });
  },

  /**
   * 429 Too Many Requests with Retry-After header.
   */
  tooManyRequests(retryAfterMs: number) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        retryAfterSeconds: retryAfterSec,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
        },
      },
    );
  },

  /**
   * 500 Internal Server Error. Logs the underlying error.
   */
  serverError(message: string, cause?: unknown) {
    logger.error(`[API] ${message}`, cause);
    return NextResponse.json({ error: message }, { status: 500 });
  },
};

/**
 * Verify the Bearer token from an Authorization header matches
 * a valid Supabase user, and that the user is an admin.
 *
 * Returns the verified admin user ID, or throws a NextResponse on failure.
 */
export async function verifyAdminToken(
  authHeader: string | null,
): Promise<string> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw apiResponse.unauthorized("No token provided");
  }

  const token = authHeader.substring(7);

  const verifyClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const {
    data: { user },
    error: authError,
  } = await verifyClient.auth.getUser(token);

  if (authError || !user) {
    if (authError) logger.error("Auth verification error:", authError);
    throw apiResponse.unauthorized("Invalid token");
  }

  // Check admin role in the users table
  const { data: userData, error: roleError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (roleError || userData?.role !== "admin") {
    if (roleError) logger.error("Role verification error:", roleError);
    else logger.warn(`User ${user.id} attempted admin action with role: ${userData?.role}`);
    throw apiResponse.forbidden();
  }

  return user.id;
}
