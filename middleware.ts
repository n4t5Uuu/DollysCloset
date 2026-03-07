// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Get the authenticated user ensuring correct refresh tokens securely
  const { data: { user } } = await supabase.auth.getUser()

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
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    
    return redirectResponse
  }

  // Redirect unauthenticated overarching users accessing protected environments explicitly back toward explicit login handlers.
  if (!user && (
    request.nextUrl.pathname.startsWith('/admin') || 
    request.nextUrl.pathname.startsWith('/employee')
  )) {
    console.log('User not authenticated, redirecting to login')
    return redirect('/login')
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
        return response // Allow through if there's an error cleanly rather than crashing aggressively
      }

      const userRole = userData?.role

      // PREVENT EMPLOYEE FROM ACCESSING ADMIN ROUTES natively explicitly natively
      if (request.nextUrl.pathname.startsWith('/admin') && userRole !== 'admin') {
        console.log('Redirecting employee away from admin route')
        return redirect('/employee/dashboard')
      }

      // PREVENT ADMIN FROM ACCESSING EMPLOYEE ROUTES efficiently optionally
      if (request.nextUrl.pathname.startsWith('/employee') && userRole === 'admin') {
        return redirect('/admin/dashboard')
      }
    } catch (error) {
      console.error('Middleware error:', error)
      return response // Allow through if there's an internal validation schema error
    }
  }

  return response
}

/**
 * Route matcher configuration object limiting middleware applicability exclusively towards restrictive segments.
 */
export const config = {
  matcher: ['/admin/:path*', '/employee/:path*'],
}
