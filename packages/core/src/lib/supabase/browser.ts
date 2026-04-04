import { createBrowserClient } from '@supabase/ssr'

/**
 * Initializes a standard limited-access Supabase client for use in browser components.
 * Uses cookie-based storage (managed by @supabase/ssr) so that the session is
 * accessible to server-side components and middleware via request cookies.
 */
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
}

