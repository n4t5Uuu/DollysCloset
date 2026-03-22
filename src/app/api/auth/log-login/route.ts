import { NextRequest, NextResponse } from "next/server";
import { activityHelper } from "@/lib/activity/activity-helper";
import { admin } from "@/lib/supabase/admin";

/**
 * Endpoint responsible for securely documenting login hits into auditing tables using absolute credentials.
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id, email, actionType = "login" } = await request.json();

    if (!user_id || !email) {
      return NextResponse.json({ error: "Missing identity payloads" }, { status: 400 });
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
