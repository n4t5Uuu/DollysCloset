import { NextRequest, NextResponse } from "next/server";
import { activityHelper } from "@/lib/activity/activity-helper";
import { createAdminClient, createServerSupabase } from "@dollys-closet/core";

const ALLOWED_ACTION_TYPES = ["login", "logout"] as const;
type AllowedActionType = typeof ALLOWED_ACTION_TYPES[number];

/**
 * Endpoint responsible for documenting verified login/logout events.
 * The acting user is derived from a validated session or bearer token.
 */
export async function POST(request: NextRequest) {
  try {
    const { actionType = "login" } = await request.json().catch(() => ({ actionType: "login" }));

    if (!ALLOWED_ACTION_TYPES.includes(actionType as AllowedActionType)) {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    let user = null;
    const authHeader = request.headers.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const supabaseAdmin = createAdminClient();
      const { data, error } = await supabaseAdmin.auth.getUser(token);

      if (error || !data.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      user = data.user;
    } else {
      const supabase = await createServerSupabase();
      const {
        data: { user: cookieUser },
        error,
      } = await supabase.auth.getUser();

      if (error || !cookieUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      user = cookieUser;
    }

    const email = user.email || "unknown";

    const supabaseAdmin = createAdminClient();
    const logged = await activityHelper.logActivity({
      actionType,
      description: `User ${email} ${actionType === "login" ? "logged in" : "logged out"}`,
      user_id: user.id,
      editor: email,
      supabase: supabaseAdmin,
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
