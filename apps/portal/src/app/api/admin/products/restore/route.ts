import { NextRequest, NextResponse } from "next/server";
import { activityHelper } from "@/lib/activity/activity-helper";
import { requireRequestAuth } from "@/lib/auth/auth-server";
import { createAdminClient, productHelper } from "@dollys-closet/core";

const MAX_BULK_RESTORE_PRODUCTS = 100;

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

    if (productIds.length > MAX_BULK_RESTORE_PRODUCTS) {
      return NextResponse.json(
        { error: `You can restore up to ${MAX_BULK_RESTORE_PRODUCTS} products at a time.` },
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

    const archivedProductIds = matchedProducts
      .filter((product) => Boolean(product.archived_at))
      .map((product) => Number(product.product_id));

    if (archivedProductIds.length > 0) {
      const { error: restoreError } = await productHelper.updateProductsBulk(
        archivedProductIds,
        { archived_at: null },
        supabaseAdmin
      );

      if (restoreError) {
        return NextResponse.json({ error: restoreError.message }, { status: 500 });
      }
    }

    const editor = authResult.user.email || authResult.user.user_metadata?.username || "Unknown";
    await activityHelper.logActivity({
      actionType: "restore_product",
      productId: archivedProductIds.length === 1 ? archivedProductIds[0] : null,
      description:
        archivedProductIds.length === 0
          ? `Restore requested, but ${summarizeProducts(matchedProducts)} were already active.`
          : archivedProductIds.length === 1
            ? `Restored product: ${matchedProducts.find((product) => Number(product.product_id) === archivedProductIds[0])?.product_name ?? archivedProductIds[0]}`
            : `Restored ${archivedProductIds.length} product(s): ${summarizeProducts(matchedProducts.filter((product) => product.archived_at))}`,
      editor,
      user_id: authResult.user.id,
      supabase: supabaseAdmin,
    });

    return NextResponse.json({
      success: true,
      restored_count: archivedProductIds.length,
      restored_ids: archivedProductIds,
      message:
        archivedProductIds.length === 0
          ? "Selected products were already active."
          : archivedProductIds.length === 1
            ? "Product restored successfully."
            : `Restored ${archivedProductIds.length} products successfully.`,
    });
  } catch (error: unknown) {
    console.error("Error restoring products:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
