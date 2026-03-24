// src/app/api/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createServerSupabase } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirect destination
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
       return NextResponse.redirect(`${origin}${next}`)
    } else {
       console.error("Callback Exchange Error:", error)
    }
  }

  // return the user to login with error
  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`)
}
