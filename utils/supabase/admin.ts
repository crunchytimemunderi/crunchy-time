import { createClient } from "@supabase/supabase-js";

/**
 * Singleton Supabase admin client using the service role key.
 * Only use this server-side (API routes, scripts).
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
 */
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

export { supabaseAdmin };
