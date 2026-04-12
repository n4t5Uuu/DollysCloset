import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@dollys-closet/core/lib/supabase/admin";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();
    const redirectTo = String(body?.redirectTo || "").trim();

    if (!email || !redirectTo) {
      return NextResponse.json(
        { error: "Email and redirect URL are required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: userRow, error: lookupError } = await supabaseAdmin
      .from("active_users")
      .select("user_id")
      .ilike("username", email)
      .maybeSingle();

    if (lookupError) {
      console.error("Forgot password lookup error:", lookupError.message);
      return NextResponse.json({ error: "Unable to process request right now." }, { status: 500 });
    }

    if (!userRow) {
      return NextResponse.json({ error: "No account found for that email address." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Forgot password API error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
