import { NextRequest, NextResponse } from "next/server";
import { activityHelper } from "@/lib/activity/activity-helper";
import { admin } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

const ALLOWED_ACTION_TYPES = ["login", "logout"] as const;
type AllowedActionType = typeof ALLOWED_ACTION_TYPES[number];

/**
 * Endpoint responsible for securely documenting login hits into auditing tables using absolute credentials.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the request comes from an authenticated session
    const supabase = await createServerSupabase();
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user_id, email, actionType = "login" } = await request.json();

    if (!user_id || !email) {
      return NextResponse.json({ error: "Missing identity payloads" }, { status: 400 });
    }

    // Only allow known action types
    if (!ALLOWED_ACTION_TYPES.includes(actionType as AllowedActionType)) {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    // Ensure the session user matches the user_id being logged
    if (sessionUser.id !== user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Insert record with admin client bypassing client insertions
    const logged = await activityHelper.logActivity({
      actionType: actionType,
      description: `User ${email} ${actionType === "login" ? "logged in" : "logged out"}`,
      user_id: user_id,
      editor: email,
      supabase: admin,
    });

    if (!logged) {
      return NextResponse.json({ error: "Failed to create activity log" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Unexpected error in log-login api:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
