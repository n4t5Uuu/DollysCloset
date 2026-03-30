// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Generates an isolated internal secure Supabase API interface tailored explicitly for Next.js internal Server Components parsing cookies robustly natively.
 * @returns Instantiated server mapping tracking internal cookie stores seamlessly.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // In development, strip the Secure flag so cookies work
              // over plain HTTP (e.g. local-network mobile testing).
              const safeOptions = process.env.NODE_ENV === 'development'
                ? { ...options, secure: false }
                : options;
              cookieStore.set(name, value, safeOptions);
            });
          } catch {
            // Safe to ignore in Server Components
          }
        },
      },
    }
  );
}
