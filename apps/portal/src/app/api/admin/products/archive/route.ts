import { NextRequest, NextResponse } from "next/server";
import { activityHelper } from "@/lib/activity/activity-helper";
import { requireRequestAuth } from "@/lib/auth/auth-server";
import { createAdminClient, productHelper } from "@dollys-closet/core";

const MAX_BULK_ARCHIVE_PRODUCTS = 100;

function normalizeProductIds(payload: Record<string, unknown>) {
  const rawIds = Array.isArray(payload.product_ids)
    ? payload.product_ids
    : payload.product_id !== undefined
      ? [payload.product_id]
      : [];

  return Array.from(
    new Set(
      rawIds
        .map((value) => Number.parseInt(String(value), 10))
        .filter((value) => !Number.isNaN(value))
    )
  );
}

function summarizeProducts(products: Array<{ product_name: string }>) {
  const names = products.map((product) => product.product_name).filter(Boolean);
  if (names.length === 0) return "selected product(s)";
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const payload = await request.json().catch(() => ({}));
    const productIds = normalizeProductIds(payload);

    if (productIds.length === 0) {
      return NextResponse.json({ error: "Provide at least one valid product_id." }, { status: 400 });
    }

    if (productIds.length > MAX_BULK_ARCHIVE_PRODUCTS) {
      return NextResponse.json(
        { error: `You can archive up to ${MAX_BULK_ARCHIVE_PRODUCTS} products at a time.` },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();
    const { data: matchingProducts, error: fetchError } = await supabaseAdmin
      .from("tbl_product")
      .select("product_id, product_name, archived_at")
      .in("product_id", productIds);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const matchedProducts = matchingProducts ?? [];
    if (matchedProducts.length === 0) {
      return NextResponse.json({ error: "No matching products were found." }, { status: 404 });
    }

    const activeProductIds = matchedProducts
      .filter((product) => !product.archived_at)
      .map((product) => Number(product.product_id));

    if (activeProductIds.length > 0) {
      const { error: archiveError } = await productHelper.updateProductsBulk(
        activeProductIds,
        { archived_at: new Date().toISOString() },
        supabaseAdmin
      );

      if (archiveError) {
        return NextResponse.json({ error: archiveError.message }, { status: 500 });
      }
    }

    const editor = authResult.user.email || authResult.user.user_metadata?.username || "Unknown";
    await activityHelper.logActivity({
      actionType: "archive_product",
      productId: activeProductIds.length === 1 ? activeProductIds[0] : null,
      description:
        activeProductIds.length === 0
          ? `Archive requested, but ${summarizeProducts(matchedProducts)} were already archived.`
          : activeProductIds.length === 1
            ? `Archived product: ${matchedProducts.find((product) => Number(product.product_id) === activeProductIds[0])?.product_name ?? activeProductIds[0]}`
            : `Archived ${activeProductIds.length} product(s): ${summarizeProducts(matchedProducts.filter((product) => !product.archived_at))}`,
      editor,
      user_id: authResult.user.id,
      supabase: supabaseAdmin,
    });

    return NextResponse.json({
      success: true,
      archived_count: activeProductIds.length,
      archived_ids: activeProductIds,
      message:
        activeProductIds.length === 0
          ? "Selected products were already archived."
          : activeProductIds.length === 1
            ? "Product archived successfully."
            : `Archived ${activeProductIds.length} products successfully.`,
    });
  } catch (error: unknown) {
    console.error("Error archiving products:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
