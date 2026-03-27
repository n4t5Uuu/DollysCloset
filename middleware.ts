// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { buildLoginPath, buildUnauthorizedPath } from '@/lib/auth-routing'

/**
 * Next.js Middleware for Route Protection and Authentication
 * 
 * Middleware runs before a request is completed. It intercepts requests entirely
 * and enforces correct routing according to the authenticated status of a user 
 * accessing `/admin` or `/employee` secure routes.
 *
 * @param {NextRequest} request - The incoming HTTP request.
 * @returns {Promise<NextResponse>} The outgoing HTTP response, optionally manipulated or redirected.
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
            const sessionOptions = { ...options };
            delete sessionOptions.maxAge;
            delete sessionOptions.expires;
            
            response.cookies.set(name, value, sessionOptions);
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
