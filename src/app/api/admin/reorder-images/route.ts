import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { authHelper } from "@/lib/auth-helper";
import { productHelper } from "@/lib/products/product-helper";
import { activityHelper } from "@/lib/activity/activity-helper";

/**
 * Reorders the display sequence of images tied to a specific product.
 * Requires admin privileges via Bearer token authorization.
 * Iterates through the provided array and sequentially updates the `display_order` mapping for each image.
 * Logs the reordering activity into the `tbl_activity_log`.
 * @param request - Next.js Request housing the authorization headers alongside `product_id` and `orderedImageIds` payload.
 * @returns JSON response containing the newly updated order mappings across the relevant product's gallery.
 */
export async function PUT(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authorization.replace("Bearer ", "");
    const { data: { user }, error: userError } = await admin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const roleResponse = await authHelper.getUserRole(user.id, admin);
    if (roleResponse.error || roleResponse.data?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { product_id, orderedImageIds } = await request.json();

    if (!product_id || !orderedImageIds || !Array.isArray(orderedImageIds)) {
      return NextResponse.json({ error: "Missing product_id or orderedImageIds" }, { status: 400 });
    }

    // Update display_order for each image based on new order (batched for performance)
    const updates = orderedImageIds.map((imageId, index) => ({
      image_id: imageId,
      payload: { display_order: index + 1 }
    }));

    const { error: batchError } = await productHelper.batchUpdateProductImages(updates, admin);
    if (batchError) throw batchError;

    // Get updated images
    const { data: updatedImages } = await productHelper.getProductImages(product_id, admin);

    // Log activity
    const editor = user.email || user.user_metadata?.username || "Unknown";
    await activityHelper.logActivity({
      actionType: "reorder_images",
      productId: parseInt(product_id),
      description: "Reordered product images",
      editor: editor,
      user_id: user.id,
      supabase: admin
    });

    return NextResponse.json(updatedImages);
  } catch (error) {
    console.error("Reorder error:", error);
    return NextResponse.json(
      { error: "Failed to reorder images", details: (error as Error).message },
      { status: 500 }
    );
  }
}
