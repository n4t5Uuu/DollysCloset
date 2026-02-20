import { admin } from "@/lib/supabase/admin";
import { authHelper } from "@/lib/auth-helper";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData, error: roleError } = await authHelper.getUserRole(user.id, admin);
    if (roleError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { error } = await admin
      .from("tbl_activity_log")
      .delete()
      .gte("log_id", 0);

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
