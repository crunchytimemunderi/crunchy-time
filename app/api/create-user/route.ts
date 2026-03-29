import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limiter";
import { apiResponse, verifyAdminToken } from "@/lib/api-response";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 requests per 15 minutes per IP
    const rl = checkRateLimit(request, "create-user", {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!rl.allowed) return apiResponse.tooManyRequests(rl.retryAfterMs);

    // Verify caller is an authenticated admin
    const authHeader = request.headers.get("authorization");
    await verifyAdminToken(authHeader);

    const { username, password, display_name, role } = await request.json();

    if (!username || !password || !display_name || !role) {
      return apiResponse.badRequest("Missing required fields");
    }

    if (username.length < 3) {
      return apiResponse.badRequest("Username must be at least 3 characters");
    }

    if (password.length < 6) {
      return apiResponse.badRequest("Password must be at least 6 characters");
    }

    if (!["admin", "staff"].includes(role)) {
      return apiResponse.badRequest("Role must be 'admin' or 'staff'");
    }

    // Generate synthetic email for Supabase Auth
    const email = `${username}@crunchy-times.local`;

    // Create auth user (no session created) using admin client
    const { data: authData, error: createAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name, username },
      });

    if (createAuthError) {
      return apiResponse.badRequest(createAuthError.message);
    }

    if (!authData.user) {
      return apiResponse.serverError("Failed to create auth user");
    }

    // Insert into users table
    const { error: dbError } = await supabaseAdmin.from("users").insert({
      id: authData.user.id,
      username,
      email,
      display_name,
      role,
    });

    if (dbError) {
      // Rollback: delete auth user if DB insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return apiResponse.badRequest(dbError.message);
    }

    return apiResponse.ok({
      success: true,
      user: { id: authData.user.id, username, email, display_name, role },
    });
  } catch (err: unknown) {
    // verifyAdminToken throws a NextResponse on auth failures
    if (err instanceof NextResponse) return err;
    logger.error("Error creating user:", err);
    return apiResponse.serverError("Failed to create user", err);
  }
}
