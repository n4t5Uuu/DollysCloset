import { createBrowserClient } from '@supabase/ssr'

/**
 * Initializes a standard limited-access Supabase client restricted explicitly via browser components globally natively.
 */
export const browserSupabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);