import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { ABOUT_SLUG, CONTACT_SLUG, buildAboutAggregate, buildContactAggregate } from "../../../lib/business-details";

const BUSINESS_DETAILS_TABLES = ["tbl_business_details", "business_details"] as const;

type BusinessDetailsRow = {
  slug?: string | null;
  title?: string | null;
  body?: string | null;
  updated_at?: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    for (const tableName of BUSINESS_DETAILS_TABLES) {
      const result = await admin
        .from(tableName)
        .select("slug, title, body, updated_at")
        .eq("slug", slug)
        .order("updated_at", { ascending: false, nullsFirst: false });

      if (!result.error) {
        const rows = (result.data as BusinessDetailsRow[]) || [];

        if (slug === CONTACT_SLUG) {
          return NextResponse.json({ data: buildContactAggregate(rows) });
        }

        if (slug === ABOUT_SLUG) {
          return NextResponse.json({ data: buildAboutAggregate(rows) });
        }

        return NextResponse.json({ data: rows[0] || null });
      }

      if (!result.error.message.toLowerCase().includes("does not exist")) {
        return NextResponse.json({ error: result.error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Could not find business details table" }, { status: 500 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch business details" },
      { status: 500 }
    );
  }
}
