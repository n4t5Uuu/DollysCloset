import { createBrowserClient } from '@supabase/ssr'

/**
 * Initializes a standard limited-access Supabase client restricted explicitly via browser components globally natively.
 */
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: true,
                storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
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

                        if (!value) {
                            document.cookie = `${name}=; path=${sessionOptions.path || '/'}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
                            return;
                        }

                        let cookieString = `${name}=${encodeURIComponent(value)}; path=${sessionOptions.path || '/'}`;
                        if (sessionOptions.domain) cookieString += `; domain=${sessionOptions.domain}`;
                        if (sessionOptions.sameSite) cookieString += `; samesite=${sessionOptions.sameSite}`;
                        
                        const isSecureOrigin = window.location.protocol === 'https:';
                        if (sessionOptions.secure && isSecureOrigin) cookieString += `; secure`;

                        document.cookie = cookieString;
                    });
                }
            } : undefined
        }
    );
}

