import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { buildLoginPath, buildUnauthorizedPath } from '@/lib/auth/auth-routing'

/**
 * middleware.ts
 *
 * Next.js Middleware for Route Protection and Authentication.
 *
 * Intercepts requests to `/dashboard` to:
 * 1. Refresh Supabase auth tokens and propagate them to both Request and Response.
 * 2. Enforce authentication — unauthenticated users are redirected to login.
 * 3. Implement inactivity timeout (30 min) via cookie-based tracking.
 * 4. Prevent browser "Back-Forward Cache" (bfcache) via strict Cache-Control headers.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            const sessionOptions = { ...options };
            delete sessionOptions.maxAge;
            delete sessionOptions.expires;

            const safeOptions = process.env.NODE_ENV === 'development'
              ? { ...sessionOptions, secure: false }
              : sessionOptions;
            response.cookies.set(name, value, safeOptions);
          });
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError) {
    console.warn('Middleware auth error:', authError.message)
  }

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');

  /**
   * --- Inactivity Timeout ---
   *
   * Tracks last interaction via the `dollys-closet-last-active` cookie.
   * If elapsed time exceeds 30 minutes, signs out and redirects to login.
   */
  const INACTIVITY_THRESHOLD = 30 * 60 * 1000;
  const lastActiveCookieName = 'dollys-closet-last-active';
  const lastActive = request.cookies.get(lastActiveCookieName)?.value;

  if (user && isDashboardRoute) {
    const now = Date.now();
    if (lastActive) {
      const lastActiveTime = parseInt(lastActive, 10);
      const isStaleGhostSession = now - lastActiveTime > (60 * 60 * 1000); // 1 hour

      if (!isNaN(lastActiveTime) && !isStaleGhostSession && (now - lastActiveTime > INACTIVITY_THRESHOLD)) {
        console.log('Inactivity timeout reached. Logging user out.');
        await supabase.auth.signOut();
        response.cookies.delete(lastActiveCookieName);

        const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
        return NextResponse.redirect(new URL(buildLoginPath({
          nextPath,
          reason: 'session-expired'
        }), request.url));
      }
    }

    response.cookies.set(lastActiveCookieName, now.toString(), {
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
      secure: process.env.NODE_ENV !== 'development',
    });
  }

  /**
   * Helper to redirect while preserving cookies modified by Supabase.
   */
  const redirect = (pathname: string) => {
    const redirectUrl = new URL(pathname, request.url)
    const redirectResponse = NextResponse.redirect(redirectUrl)

    response.cookies.getAll().forEach((cookie) => {
      const { name, value, ...options } = cookie;
      redirectResponse.cookies.set(name, value, options)
    })

    return redirectResponse
  }

  // Redirect unauthenticated users to login
  if (!user && isDashboardRoute) {
    console.log('User not authenticated, redirecting to login');
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

    // SELF-HEALING: If an auth error exists (stale/invalid cookie), 
    // explicitly sign out to purge those cookies from the browser 
    // before redirecting. This prevents "Session Expired" loops.
    if (authError) {
      console.warn('Stale session detected. Purging cookies for safety.');
      await supabase.auth.signOut();
    }

    return redirect(buildLoginPath({
      nextPath,
      reason: authError ? 'session-expired' : 'login-required',
    }));
  }

  // Prevent bfcache on protected routes
  if (isDashboardRoute) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, proxy-revalidate, s-maxage=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/reset-password'],
}
