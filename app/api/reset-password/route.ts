import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limiter";
import { apiResponse, verifyAdminToken } from "@/lib/api-response";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 requests per 15 minutes per IP
    const rl = checkRateLimit(request, "reset-password", {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!rl.allowed) return apiResponse.tooManyRequests(rl.retryAfterMs);

    // Verify caller is an authenticated admin
    const authHeader = request.headers.get("authorization");
    await verifyAdminToken(authHeader);

    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return apiResponse.badRequest("Missing userId or newPassword");
    }

    if (newPassword.length < 6) {
      return apiResponse.badRequest("Password must be at least 6 characters");
    }

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

    if (updateError) {
      logger.error("Password update error:", updateError);
      return apiResponse.serverError(updateError.message);
    }

    return apiResponse.ok({ success: true, message: "Password updated successfully" });
  } catch (err: unknown) {
    // verifyAdminToken throws a NextResponse on auth failures
    if (err instanceof NextResponse) return err;
    logger.error("Password reset error:", err);
    return apiResponse.serverError("Internal server error", err);
  }
}
