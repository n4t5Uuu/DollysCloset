import { admin } from "@/lib/supabase/admin";
import { authHelper } from "@/lib/auth-helper";
import { activityHelper } from "@/lib/activity/activity-helper";
import { createServerSupabase } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Hard resets all underlying history tracked inside the `tbl_activity_log` component natively.
 * Strictly checks that the initiating user possesses core administrative system privileges securely.
 * @param request - Native Next.js Request executing via a valid generic POST request possessing a robust Bearer logic frame.
 * @returns A JSON outcome conveying an empty execution code (200) signifying absolute system flush success.
 */
export async function POST(request: NextRequest) {
  try {
    let userId: string | null = null;

    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await admin.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      const supabase = await createServerSupabase();
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;
    }

    const { data: userData, error: roleError } = await authHelper.getUserRole(userId, admin);
    if (roleError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { error } = await activityHelper.clearLogs(admin);

    if (error) throw error;

    return NextResponse.json(
      { message: "Activity logs cleared successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error resetting activity logs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to clear activity logs" },
      { status: 500 }
    );
  }
}
