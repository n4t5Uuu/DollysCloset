import { createClient } from "@supabase/supabase-js";

/**
 * Instantiates an elevated Supabase client holding supreme administrative bypass permissions.
 * Avoid exposing this client logic across public component rendering branches seamlessly.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      "CRITICAL: Supabase Admin variables are missing! " +
      "Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
    throw new Error("Supabase Admin environment variables are not configured correctly.");
  }

  return createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: { 
        persistSession: false,
        autoRefreshToken: false
      },
    }
  );
}


