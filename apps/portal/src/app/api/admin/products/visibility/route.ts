import { NextRequest, NextResponse } from "next/server";
import { activityHelper } from "@/lib/activity/activity-helper";
import { requireRequestAuth } from "@/lib/auth/auth-server";
import { createAdminClient, productHelper } from "@dollys-closet/core";

const MAX_BULK_VISIBILITY_PRODUCTS = 100;

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
    const setVisible = payload.visible === true;

    if (productIds.length === 0) {
      return NextResponse.json({ error: "Provide at least one valid product_id." }, { status: 400 });
    }

    if (productIds.length > MAX_BULK_VISIBILITY_PRODUCTS) {
      return NextResponse.json(
        { error: `You can update up to ${MAX_BULK_VISIBILITY_PRODUCTS} products at a time.` },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();
    
    // Fetch products to verify existence and check stock for 'Show' action
    const { data: matchingProducts, error: fetchError } = await supabaseAdmin
      .from("tbl_product")
      .select("product_id, product_name, product_stock, show_in_catalog, archived_at")
      .in("product_id", productIds);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const matchedProducts = matchingProducts ?? [];
    if (matchedProducts.length === 0) {
      return NextResponse.json({ error: "No matching products were found." }, { status: 404 });
    }

    // Filter out archived products as they shouldn't have their visibility toggled while archived
    const activeProducts = matchedProducts.filter(p => !p.archived_at);
    
    if (activeProducts.length === 0) {
        return NextResponse.json({ error: "Selected products are archived and cannot be toggled." }, { status: 400 });
    }

    let finalIdsToUpdate: number[] = [];
    let skippedCount = 0;

    if (setVisible) {
        // Only show products that have stock > 0
        finalIdsToUpdate = activeProducts
            .filter(p => p.product_stock > 0)
            .map(p => Number(p.product_id));
        skippedCount = activeProducts.length - finalIdsToUpdate.length;
    } else {
        // Hide is always allowed
        finalIdsToUpdate = activeProducts.map(p => Number(p.product_id));
    }

    if (finalIdsToUpdate.length > 0) {
        const { error: updateError } = await productHelper.updateProductsBulk(
            finalIdsToUpdate,
            { show_in_catalog: setVisible },
            supabaseAdmin
        );

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
    }

    const editor = authResult.user.email || authResult.user.user_metadata?.username || "Unknown";
    const actionLabel = setVisible ? "shown in" : "hidden from";
    
    await activityHelper.logActivity({
      actionType: "edit_product",
      productId: finalIdsToUpdate.length === 1 ? finalIdsToUpdate[0] : null,
      description: `Batch updated visibility: ${finalIdsToUpdate.length} product(s) ${actionLabel} catalog. ${skippedCount > 0 ? `${skippedCount} out-of-stock products skipped.` : ""}`,
      editor,
      user_id: authResult.user.id,
      supabase: supabaseAdmin,
    });

    return NextResponse.json({
      success: true,
      updated_count: finalIdsToUpdate.length,
      skipped_count: skippedCount,
      message: skippedCount > 0 
        ? `Updated ${finalIdsToUpdate.length} products. ${skippedCount} out-of-stock products were skipped.`
        : `Successfully ${setVisible ? 'published' : 'hidden'} ${finalIdsToUpdate.length} product(s).`,
    });

  } catch (error: unknown) {
    console.error("Error updating product visibility:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
