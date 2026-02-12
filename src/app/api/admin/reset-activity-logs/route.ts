import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { error } = await supabaseAdmin
      .from("tbl_activity_log")
      .delete()
      .gte("log_id", 0);

    if (error) throw error;

    return NextResponse.json(
      { message: "Activity logs cleared successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error resetting activity logs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to clear activity logs" },
      { status: 500 }
    );
  }
}
