import { NextResponse } from "next/server";
import {
  createAdminClient,
  getCatalogPayload,
} from "@dollys-closet/core";

/**
 * Retrieves the compiled logic representing uniform catalog objects reflecting `show_in_catalog` states prominently.
 * Parallelizes extensive fetches bridging category boundaries, gallery listings, and the products base logic efficiently natively.
 * Public endpoint matching end-user catalog interface loops internally logically structured cleanly against types contexts.
 * @returns A comprehensive response JSON packing categorized metadata bridging generic views alongside new release filters.
 */
export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();
    const result = await getCatalogPayload(supabaseAdmin);

    if (result.error) {
      console.error("Catalog Fetch Error:", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error: unknown) {
    console.error('CRITICAL ERROR in Catalog GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch catalog" },
      { status: 500 }
    );
  }
}

