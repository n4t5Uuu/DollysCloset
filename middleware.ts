// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if not authenticated
  if (!user && (
    request.nextUrl.pathname.startsWith('/admin') || 
    request.nextUrl.pathname.startsWith('/employee')
  )) {
    console.log('User not authenticated, redirecting to login')
    return NextResponse.redirect(new URL('/staff-login', request.url))
  }

  // If authenticated, check role-based access
  if (user) {
    try {
      const { data: userData, error } = await supabase
        .from('tbl_users')
        .select('role')
        .eq('user_id', user.id)
        .single()

      // Log any errors
      if (error) {
        console.error('Middleware DB error:', error)
        return response // Allow through if there's an error
      }

      const userRole = userData?.role

      // PREVENT EMPLOYEE FROM ACCESSING ADMIN ROUTES
      if (request.nextUrl.pathname.startsWith('/admin') && userRole !== 'admin') {
        console.log('Redirecting employee away from admin route')
        return NextResponse.redirect(new URL('/employee/dashboard', request.url))
      }

      // PREVENT ADMIN FROM ACCESSING EMPLOYEE ROUTES (optional)
      if (request.nextUrl.pathname.startsWith('/employee') && userRole === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
    } catch (error) {
      console.error('Middleware error:', error)
      return response // Allow through if there's an error
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/employee/:path*'],
}