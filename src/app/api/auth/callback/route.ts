// src/app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirect destination
  const rawNext = searchParams.get('next') ?? '/'
  // Only allow internal relative paths to prevent open redirect attacks
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  if (code) {
    // Build the redirect response first so we can attach cookies directly to it
    const redirectResponse = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Set cookies directly on the response we will return
            cookiesToSet.forEach(({ name, value, options }) => {
              redirectResponse.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return redirectResponse
    }

    console.error("Callback Exchange Error:", error.message || error)

    // Fallback for "refresh token not found" or double-click / scanner-consumption issues.
    // If the browser already has a valid session from the first concurrent request, proceed.
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      return redirectResponse
    }

    if (next.includes("reset-password")) {
      return NextResponse.redirect(`${origin}/forgot-password?error=expired`)
    }
  }

  // return the user to login with error
  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`)
}
