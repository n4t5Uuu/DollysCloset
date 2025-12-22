import {createBrowserClient } from '@supabase/ssr'

// client-side client (used for client compnents)
export const browserSupabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);