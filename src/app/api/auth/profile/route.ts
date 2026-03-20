import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userRow } = await supabase
      .from("tbl_users")
      .select("first_name, last_name, role")
      .eq("user_id", user.id)
      .maybeSingle();

    const firstName = String(userRow?.first_name || "").trim();
    const lastName = String(userRow?.last_name || "").trim();
    const fullNameFromTable = [firstName, lastName].filter(Boolean).join(" ").trim();

    const metadata = user.user_metadata || {};
    const fullNameFromMetadata = String(metadata.full_name || metadata.name || "").trim();
    const fullNameFromParts = [
      String(metadata.first_name || "").trim(),
      String(metadata.last_name || "").trim(),
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const displayName =
      fullNameFromTable ||
      fullNameFromParts ||
      fullNameFromMetadata ||
      String(user.email?.split("@")[0] || "there").trim();

    return NextResponse.json({
      data: {
        userId: user.id,
        role: userRow?.role || null,
        displayName,
        firstName: userRow?.first_name || "",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load profile" },
      { status: 500 }
    );
  }
}
