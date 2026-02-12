import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get the authorization token from the request
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);

    // Create a client authenticated with the user's token
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    );

    // Verify the user making the request
    const {
      data: { user: requestingUser },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !requestingUser) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 },
      );
    }

    console.log("Requesting user ID:", requestingUser.id);

    // Check if the requesting user is an admin
    const { data: userData, error: userError } = await supabaseClient
      .from("users")
      .select("role")
      .eq("id", requestingUser.id)
      .single();

    console.log("User data query result:", { userData, userError });

    if (userError || !userData || userData.role !== "admin") {
      console.error("Admin check failed:", {
        userError,
        userData,
        role: userData?.role,
      });
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    console.log("Admin check passed for user:", requestingUser.id);

    // Get the request body
    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: "Missing userId or newPassword" },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

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

    // Update the user's password
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

    if (updateError) {
      console.error("Password update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error: any) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
