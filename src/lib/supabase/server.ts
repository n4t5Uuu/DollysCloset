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
              const sessionOptions = { ...options };
              delete sessionOptions.maxAge;
              delete sessionOptions.expires;
              
              cookieStore.set(name, value, sessionOptions);
            });
          } catch {
            // Safe to ignore in Server Components
          }
        },
      },
    }
  );
}
