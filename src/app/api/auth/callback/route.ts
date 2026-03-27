// src/app/api/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirect destination
  const rawNext = searchParams.get('next') ?? '/'
  // Only allow internal relative paths to prevent open redirect attacks
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error("Callback Exchange Error:", error.message || error)
      
      // Fallback for "refresh token not found" or double-click / scanner-consumption issues.
      // If the browser already has a valid session from the first concurrent request, proceed.
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      if (next.includes("reset-password")) {
        return NextResponse.redirect(`${origin}/forgot-password?error=expired`)
      }
    }
  }

  // return the user to login with error
  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`)
}
