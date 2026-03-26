import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 requests per 15 minutes
    const rl = checkRateLimit(request, "create-user", {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

    // ─── Auth check: require admin ───
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);

    // Verify the requesting user's token
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      },
    );

    const {
      data: { user: requestingUser },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !requestingUser) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 },
      );
    }

    // Check admin role
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", requestingUser.id)
      .single();

    if (adminError || !adminCheck || adminCheck.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }
    // ─── End auth check ───

    const { username, password, display_name, role } = await request.json();

    // Validate inputs
    if (!username || !password || !display_name || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Generate email
    const email = `${username}@crunchy-times.local`;

    // Create user with admin client (no session created)
    const { data: authData, error: createAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm
        user_metadata: {
          display_name,
          username,
        },
      });

    if (createAuthError) {
      return NextResponse.json(
        { error: createAuthError.message },
        { status: 400 },
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create auth user" },
        { status: 500 },
      );
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
      // Rollback: delete auth user if users table insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        username,
        email,
        display_name,
        role,
      },
    });
  } catch (error: any) {
    logger.error("Error creating user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 },
    );
  }
}
