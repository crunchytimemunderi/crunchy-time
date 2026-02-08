import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm
        user_metadata: {
          display_name,
          username,
        },
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
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
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 },
    );
  }
}
