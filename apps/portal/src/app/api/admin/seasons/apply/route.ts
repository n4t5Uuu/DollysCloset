import { NextRequest, NextResponse } from "next/server";
import { activityHelper } from "@/lib/activity/activity-helper";
import { requireRequestAuth } from "@/lib/auth/auth-server";
import { createAdminClient, productHelper } from "@dollys-closet/core";

const MAX_BULK_SEASON_PRODUCTS = 100;

function normalizeProductIds(payload: Record<string, unknown>) {
  const rawIds = Array.isArray(payload.product_ids) ? payload.product_ids : [];

  return Array.from(
    new Set(
      rawIds
        .map((value) => Number.parseInt(String(value), 10))
        .filter((value) => !Number.isNaN(value))
    )
  );
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const productIds = normalizeProductIds(payload);
    const rawSeasonId = typeof payload.season_id === "string" ? payload.season_id.trim() : null;
    const seasonId = rawSeasonId ? rawSeasonId : null;

    if (productIds.length === 0) {
      return NextResponse.json({ error: "Provide at least one valid product_id." }, { status: 400 });
    }

    if (productIds.length > MAX_BULK_SEASON_PRODUCTS) {
      return NextResponse.json(
        { error: `You can update up to ${MAX_BULK_SEASON_PRODUCTS} products at a time.` },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();
    const { data: matchingProducts, error: fetchError } = await supabaseAdmin
      .from("tbl_product")
      .select("product_id")
      .in("product_id", productIds);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!matchingProducts || matchingProducts.length === 0) {
      return NextResponse.json({ error: "No matching products were found." }, { status: 404 });
    }

    if (matchingProducts.length !== productIds.length) {
      return NextResponse.json(
        { error: "One or more selected products could not be found." },
        { status: 404 }
      );
    }

    let seasonName = "cleared season";

    if (seasonId) {
      const { data: seasonRow, error: seasonError } = await supabaseAdmin
        .from("tbl_season")
        .select("season_id, season_name")
        .eq("season_id", seasonId)
        .maybeSingle();

      if (seasonError) {
        return NextResponse.json({ error: seasonError.message }, { status: 500 });
      }

      if (!seasonRow) {
        return NextResponse.json({ error: "Season not found." }, { status: 404 });
      }

      seasonName = seasonRow.season_name;
    }

    const { error: updateError } = await productHelper.updateProductsBulk(
      productIds,
      { season_id: seasonId },
      supabaseAdmin
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const editor = authResult.user.email || authResult.user.user_metadata?.username || "Unknown";
    await activityHelper.logActivity({
      actionType: "apply_season",
      description: seasonId
        ? `Applied season ${seasonName} to ${productIds.length} product(s)`
        : `Cleared season from ${productIds.length} product(s)`,
      editor,
      user_id: authResult.user.id,
      supabase: supabaseAdmin,
    });

    return NextResponse.json({
      success: true,
      updated_count: productIds.length,
      season_id: seasonId,
      season_name: seasonId ? seasonName : null,
      message: seasonId
        ? `Applied season ${seasonName} to ${productIds.length} product(s).`
        : `Cleared season from ${productIds.length} product(s).`,
    });
  } catch (error: unknown) {
    console.error("Error applying season:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to apply season" },
      { status: 500 }
    );
  }
}
