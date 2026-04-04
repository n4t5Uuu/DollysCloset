import { createServerClient } from "@supabase/ssr";

/**
 * Instantiates a Supabase Server Client for use in Server Components and API Routes.
 * 
 * Crucial implementation details:
 * 1. Session-Only Semantics: Explicitly strips `maxAge` and `expires` from auth 
 *    cookies to ensure they are treated as session-only by the browser.
 * 2. Mobile Debugging Support: Disables the `Secure` flag in development 
 *    mode to allow testing over local network HTTP.
 * 
 * @returns Instantiated server mapping tracking internal cookie stores seamlessly.
 */
export async function createServerSupabase() {
  const { cookies } = await import("next/headers");
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
              // Strictly enforce session-only semantics by stripping persistence markers.
              const sessionOptions = { ...options };
              delete sessionOptions.maxAge;
              delete sessionOptions.expires;

              // In development, strip the Secure flag so cookies work
              // over plain HTTP (e.g. local-network mobile testing).
              const safeOptions = process.env.NODE_ENV === 'development'
                ? { ...sessionOptions, secure: false }
                : sessionOptions;
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
