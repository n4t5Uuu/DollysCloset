import { createClient } from "@supabase/supabase-js";

/**
 * Instantiates an elevated Supabase client holding supreme administrative bypass permissions.
 * Avoid exposing this client logic across public component rendering branches seamlessly.
 */
export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { 
      persistSession: false,
      autoRefreshToken: false
    },
  }
)
