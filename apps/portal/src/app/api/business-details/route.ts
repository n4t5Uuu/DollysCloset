import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@dollys-closet/core/lib/supabase/admin";
import {
  ABOUT_SLUG,
  ANNOUNCEMENT_SLUG,
  CONTACT_SLUG,
  buildAboutAggregate,
  buildContactAggregate,
  sanitizeAnnouncementBody,
  businessDetailsHelper,
} from "@dollys-closet/core";
import { BusinessDetailsRow } from "@dollys-closet/core";

/**
 * Securely extracts active generic business configuration contexts aligned universally toward UI presentations.
 * Resolves targeted queries via provided URL queries checking against known mapped UI configurations (Contact/About formats).
 * Public endpoint; requires no distinct internal dashboard authorization.
 * @param request - Baseline Next.js Request triggering endpoints across public channels fetching targeted `slug` configurations.
 * @returns Consolidated API mappings outlining structured system text parameters formatted for React states natively.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const tableResult = await businessDetailsHelper.resolveTableName(supabaseAdmin);
    if (tableResult.error) {
      return NextResponse.json({ error: tableResult.error.message }, { status: 500 });
    }

    const { data: rows, error: fetchError } = await businessDetailsHelper.findAllBySlug(tableResult.tableName, slug, supabaseAdmin);

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

