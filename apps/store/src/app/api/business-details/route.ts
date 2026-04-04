import { NextRequest, NextResponse } from "next/server";
import { admin } from "@dollys-closet/core/src/lib/supabase/admin";
import {
  ABOUT_SLUG,
  ANNOUNCEMENT_SLUG,
  CONTACT_SLUG,
  buildAboutAggregate,
  buildContactAggregate,
  sanitizeAnnouncementBody,
  businessDetailsHelper,
  BusinessDetailsRow,
} from "@dollys-closet/core";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const tableResult = await businessDetailsHelper.resolveTableName(admin);
    if (tableResult.error) {
      return NextResponse.json({ error: tableResult.error.message }, { status: 500 });
    }

    const { data: rows, error: fetchError } = await businessDetailsHelper.findAllBySlug(tableResult.tableName, slug, admin);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (slug === CONTACT_SLUG) {
      return NextResponse.json({ data: buildContactAggregate((rows as BusinessDetailsRow[]) || []) });
    }

    if (slug === ABOUT_SLUG) {
      return NextResponse.json({ data: buildAboutAggregate((rows as BusinessDetailsRow[]) || []) });
    }

    const latestRow = (rows as BusinessDetailsRow[])[0] || null;

    if (slug === ANNOUNCEMENT_SLUG && latestRow) {
      return NextResponse.json({
        data: {
          ...latestRow,
          body: sanitizeAnnouncementBody(latestRow.body),
        },
      });
    }

    return NextResponse.json({ data: latestRow });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch business details" },
      { status: 500 }
    );
  }
}
