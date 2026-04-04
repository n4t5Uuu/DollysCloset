import { NextRequest, NextResponse } from 'next/server';
import { activityHelper } from "@/lib/activity/activity-helper";
import { createAdminClient, productHelper } from "@dollys-closet/core";
import { requireRequestAuth } from "@/lib/auth/auth-server";

const MAX_BULK_DELETE_PRODUCTS = 100;

/**
 * Handles the bulk deletion of products and their associated images.
 * Requires admin or employee privileges via Bearer token authorization.
 * Removes related images from `tbl_product_image`, the storage bucket, and subsequently deletes the product from `tbl_product`.
 * Logs the deletion activity upon success.
 * @param request - The Next.js request object containing authorization headers and the `product_ids` array payload.
 * @returns A JSON response detailing whether the deletion for products was universally successful.
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { user } = authResult;
    const editor = user.email || user.user_metadata?.username || 'Unknown';

    // Get product_ids from request
    const { product_ids } = await request.json();

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty product_ids array' }, { status: 400 });
    }

    if (product_ids.length > MAX_BULK_DELETE_PRODUCTS) {
      return NextResponse.json(
        { error: `You can delete up to ${MAX_BULK_DELETE_PRODUCTS} products at a time.` },
        { status: 400 }
      );
    }

    const productIds = product_ids
      .map((id: unknown) => Number.parseInt(String(id), 10))
      .filter((id: number) => !Number.isNaN(id));

    if (productIds.length === 0) {
      return NextResponse.json({ error: 'No valid product_ids provided' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Fetch product images for cleanup using productHelper
    const { data: images, error: imagesError } = await productHelper.getProductImagesBulk(productIds, supabaseAdmin);

    if (imagesError) {
      console.error('Image fetch error:', imagesError);
      return NextResponse.json({ error: imagesError.message }, { status: 500 });
    }

    if (images && images.length > 0) {
      const { error: clearImageReferenceError } = await productHelper.updateProductsBulk(productIds, { image_id: null }, supabaseAdmin);

      if (clearImageReferenceError) {
        console.error('Clear image reference error:', clearImageReferenceError);
        return NextResponse.json({ error: clearImageReferenceError.message }, { status: 500 });
      }

      const filePaths = images
        .map((img) => img.image_url?.split('/').slice(-2).join('/'))
        .filter((path) => path);

      if (filePaths.length > 0) {
        await supabaseAdmin.storage.from('product-images').remove(filePaths);
      }

      const { error: imageDeleteError } = await productHelper.deleteProductImagesBulk(productIds, supabaseAdmin);

      if (imageDeleteError) {
        console.error('Image delete error:', imageDeleteError);
        return NextResponse.json({ error: imageDeleteError.message }, { status: 500 });
      }
    }

    // Delete from tbl_product using productHelper
    const { error: deleteError } = await productHelper.deleteProductsBulk(productIds, supabaseAdmin);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Log activity for bulk delete
    await activityHelper.logActivity({
      actionType: 'delete_product',
      productId: null,
      description: `Bulk deleted ${product_ids.length} product(s)`,
      editor: editor,
      user_id: user.id,
      supabase: supabaseAdmin
    });

    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${productIds.length} product(s)`,
      deleted_count: productIds.length
    });

  } catch (error: unknown) {
    console.error('Error bulk deleting products:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
