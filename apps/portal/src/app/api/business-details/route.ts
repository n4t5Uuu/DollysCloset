import { NextRequest, NextResponse } from "next/server";
import {
  createAdminClient,
  getPublicBusinessDetailsBySlug,
} from "@dollys-closet/core";

export const dynamic = "force-dynamic";

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
    const result = await getPublicBusinessDetailsBySlug(slug, supabaseAdmin);
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch business details" },
      { status: 500 }
    );
  }
}

