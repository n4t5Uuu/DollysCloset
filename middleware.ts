// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { buildLoginPath, buildUnauthorizedPath } from '@/lib/auth/auth-routing'

/**
 * middleware.ts
 * 
 * Next.js Middleware for Route Protection and Authentication.
 * 
 * Intercepts requests to `/admin`, `/employee`, and `/dashboard` to:
 * 1. Refresh Supabase auth tokens and propagate them to both Request and Response.
 * 2. Enforce Role-Based Access Control (RBAC) by checking `tbl_users.role`.
 * 3. Prevent browser "Back-Forward Cache" (bfcache) for secure data by forcing 
 *    re-validation on every navigation via strict Cache-Control headers.
 *
 * @param {NextRequest} request - The incoming HTTP request.
 * @returns {Promise<NextResponse>} The outgoing HTTP response (redirect or content).
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Initialize a Server Client compatible with Middleware processing using cookie updates proactively
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Update the request cookies so downstream code sees the new values
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          // Apply changes to the response cookies propagating safely iteratively
          cookiesToSet.forEach(({ name, value, options }) => {
            // Strictly enforce session-only auth cookies by removing persistence markers.
            const sessionOptions = { ...options };
            delete sessionOptions.maxAge;
            delete sessionOptions.expires;

            // In development, strip the Secure flag so cookies work
            // over plain HTTP (e.g. local-network mobile testing).
            const safeOptions = process.env.NODE_ENV === 'development'
              ? { ...sessionOptions, secure: false }
              : sessionOptions;
            response.cookies.set(name, value, safeOptions);
          });
        },
      },
    }
  );

  // Get the authenticated user ensuring correct refresh tokens securely
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError) {
    console.warn('Middleware auth error:', authError.message)
  }

  const isProtectedRoute = 
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/employee') ||
    request.nextUrl.pathname.startsWith('/dashboard');

  /**
   * --- Inactivity Timeout Implementation ---
   * 
   * Tracks the user's last interaction time via the `dollys-closet-last-active` cookie.
   * If the time elapsed since the last request exceeds 30 minutes:
   * 1. The user's Supabase session is revoked via `signOut()`.
   * 2. The activity cookie is purged.
   * 3. The user is redirected to the login page with a `session-expired` reason.
   * 
   * This logic runs exclusively on protected routes (/admin, /employee, /dashboard).
   */
  const INACTIVITY_THRESHOLD = 30 * 60 * 1000; // 30 minutes
  const lastActiveCookieName = 'dollys-closet-last-active';
  const lastActive = request.cookies.get(lastActiveCookieName)?.value;

  console.log(`Middleware Activity Check: [Path: ${request.nextUrl.pathname}] [User: ${user ? 'Yes' : 'No'}] [LastActive: ${lastActive || 'None'}]`);

  if (user && isProtectedRoute) {
    const now = Date.now();
    if (lastActive) {
      const lastActiveTime = parseInt(lastActive, 10);
      if (!isNaN(lastActiveTime) && now - lastActiveTime > INACTIVITY_THRESHOLD) {
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
    
    // Always update the last active timestamp on protected routes
    // We use session-only cookie options here so browser closure clears it.
    response.cookies.set(lastActiveCookieName, now.toString(), {
      path: '/',
      sameSite: 'lax',
      httpOnly: false, // Accessible by client-side guard
      secure: process.env.NODE_ENV !== 'development',
    });
    console.log(`Updated last-active cookie: ${now}`);
  }

  /**
   * Helper function to handle transparent redirects while preserving cookies seamlessly.
   * @param {string} pathname - The intended redirected route destination.
   * @returns {NextResponse} Constructed Next response forcing redirect tracking session cookies heavily.
   */
  const redirect = (pathname: string) => {
    const redirectUrl = new URL(pathname, request.url)
    const redirectResponse = NextResponse.redirect(redirectUrl)
    
    // Crucial: Copy the cookies that were modified/deleted by Supabase
    // If we don't do this, the invalid token stays in the browser!
    response.cookies.getAll().forEach((cookie) => {
      const { name, value, ...options } = cookie;
      redirectResponse.cookies.set(name, value, options)
    })
    
    return redirectResponse
  }

  // Redirect unauthenticated users to the login page
  if (!user && (
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/employee') ||
    request.nextUrl.pathname.startsWith('/dashboard')
  )) {
    console.log('User not authenticated, redirecting to login')
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`
    return redirect(buildLoginPath({
      nextPath,
      reason: authError ? 'session-expired' : 'login-required',
    }))
  }

  // Post-authentication validation to implement accurate systemic Role-Based Access Control logic
  if (user) {
    try {
      // Query specific details ensuring valid assigned systemic privileges correctly reliably
      const { data: userData, error } = await supabase
        .from('tbl_users')
        .select('role')
        .eq('user_id', user.id)
        .single()

      // Log any errors gracefully
      if (error) {
        console.error('Middleware DB error:', error)
        return redirect(buildUnauthorizedPath('access-denied'))
      }

      const userRole = userData?.role

      // Redirect users away from routes they don't have access to
      if (request.nextUrl.pathname.startsWith('/admin') && userRole !== 'admin') {
        console.log('Redirecting non-admin away from admin route')
        return redirect(userRole === 'employee' ? '/dashboard' : buildUnauthorizedPath('access-denied'))
      }

      if (request.nextUrl.pathname.startsWith('/employee') && userRole !== 'employee') {
        return redirect(userRole === 'admin' ? '/dashboard' : buildUnauthorizedPath('access-denied'))
      }
    } catch (error) {
      console.error('Middleware error:', error)
      return redirect(buildUnauthorizedPath('access-denied'))
    }
  }

  // Ensure protected routes are never cached by the browser's back/forward cache (bfcache)
  // This guarantees that pressing the back button will force a re-validation against the server
  if (
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/employee') ||
    request.nextUrl.pathname.startsWith('/dashboard')
  ) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, proxy-revalidate, s-maxage=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response
}

/**
 * Route matcher configuration object limiting middleware applicability exclusively towards restrictive segments.
 */
export const config = {
  matcher: ['/admin/:path*', '/employee/:path*', '/dashboard/:path*', '/reset-password'],
}
