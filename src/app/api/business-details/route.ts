import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { ABOUT_SLUG, CONTACT_SLUG, buildAboutAggregate, buildContactAggregate } from "../../../lib/business-details/business-details";
import { businessDetailsHelper } from "@/lib/business-details/business-details-helper";

const BUSINESS_DETAILS_TABLES = ["tbl_business_details", "business_details"] as const;

import { BusinessDetailsRow } from "@/types/business-details.types";

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

    const tableResult = await businessDetailsHelper.resolveTableName(admin);
    if (tableResult.error) {
      return NextResponse.json({ error: tableResult.error.message }, { status: 500 });
    }

    const { data: rows, error: fetchError } = await businessDetailsHelper.findAllBySlug(tableResult.tableName, slug, admin);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (slug === CONTACT_SLUG) {
      return NextResponse.json({ data: buildContactAggregate(rows as any) });
    }

    if (slug === ABOUT_SLUG) {
      return NextResponse.json({ data: buildAboutAggregate(rows as any) });
    }

    return NextResponse.json({ data: rows[0] || null });

    return NextResponse.json({ error: "Could not find business details table" }, { status: 500 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch business details" },
      { status: 500 }
    );
  }
}
