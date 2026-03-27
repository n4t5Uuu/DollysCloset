import { createBrowserClient } from '@supabase/ssr'

/**
 * Initializes a standard limited-access Supabase client restricted explicitly via browser components globally natively.
 */
export const browserSupabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
        cookieOptions: {
            // By omitting maxAge/expires or setting them to undefined/0 in some SSR versions, 
            // the generated cookies will be bound dynamically to the browser's "Session" instead of persisting for 1 year.
        },
        cookies: typeof window !== "undefined" ? {
            getAll() {
                if (!document.cookie) return [];
                return document.cookie.split(';').map(c => {
                    const [name, ...rest] = c.split('=');
                    return { name: name.trim(), value: decodeURIComponent(rest.join('=')) };
                });
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    const sessionOptions = { ...options };
                    delete sessionOptions.maxAge;
                    delete sessionOptions.expires;

                    // When value is empty, Supabase is trying to delete the cookie
                    if (!value) {
                        document.cookie = `${name}=; path=${sessionOptions.path || '/'}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
                        return;
                    }

                    let cookieString = `${name}=${encodeURIComponent(value)}; path=${sessionOptions.path || '/'}`;
                    if (sessionOptions.domain) cookieString += `; domain=${sessionOptions.domain}`;
                    if (sessionOptions.sameSite) cookieString += `; samesite=${sessionOptions.sameSite}`;
                    if (sessionOptions.secure) cookieString += `; secure`;

                    document.cookie = cookieString;
                });
            }
        } : undefined
    }
);