import { NextRequest, NextResponse } from 'next/server';
import { authHelper } from "@/lib/auth-helper";
import { productHelper } from "@/lib/products/product-helper";
import { activityHelper } from "@/lib/activity/activity-helper";
import { admin } from "@/lib/supabase/admin";

/**
 * Eradicates a single specified product from the catalog table alongside all assigned image bucket uploads.
 * Restricts invocation strictly to profiles fulfilling 'admin' or matching 'employee' roles.
 * Modifies Supabase storage recursively to dump related gallery items prior to tearing down row definitions.
 * @param request - The Next.js Request carrying proper HTTP authorization logic and a JSON payload housing `product_id`.
 * @returns JSON indicating positive completion metrics or an exception summary.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify the requesting user is an admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can manage inventory
    const { data: userData, error: userError } = await authHelper.getUserRole(user.id, admin);

    if (userError || !['admin', 'employee'].includes(userData?.role || '')) {
      return NextResponse.json({ error: 'Forbidden: Inventory access required' }, { status: 403 });
    }

    const editor = user.email || user.user_metadata?.username || 'Unknown';

    // Get product_id from request
    const { product_id } = await request.json();

    if (!product_id) {
      return NextResponse.json({ error: 'Missing product_id' }, { status: 400 });
    }

    const productIdValue = Number.parseInt(String(product_id), 10);
    if (Number.isNaN(productIdValue)) {
      return NextResponse.json({ error: 'Invalid product_id' }, { status: 400 });
    }

    // Fetch product images for cleanup using productHelper
    const { data: images, error: imagesError } = await productHelper.getProductImages(productIdValue, admin);

    if (imagesError) {
      console.error('Image fetch error:', imagesError);
      return NextResponse.json({ error: imagesError.message }, { status: 500 });
    }

    if (images && images.length > 0) {
      const { error: clearImageReferenceError } = await productHelper.updateProduct(
        productIdValue,
        { image_id: null },
        admin
      );

      if (clearImageReferenceError) {
        console.error('Clear image reference error:', clearImageReferenceError);
        return NextResponse.json({ error: clearImageReferenceError.message }, { status: 500 });
      }

      const filePaths = images
        .map((img) => img.image_url?.split('/').slice(-2).join('/'))
        .filter((path) => path);

      if (filePaths.length > 0) {
        await admin.storage.from('product-images').remove(filePaths);
      }

      const { error: imageDeleteError } = await productHelper.deleteProductImageReferences(
        productIdValue,
        admin
      );

      if (imageDeleteError) {
        console.error('Image delete error:', imageDeleteError);
        return NextResponse.json({ error: imageDeleteError.message }, { status: 500 });
      }
    }

    // Delete from tbl_product using productHelper
    const { error: deleteError } = await productHelper.deleteProduct(productIdValue, admin);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Log activity
    await activityHelper.logActivity({
      actionType: 'delete_product',
      productId: product_id,
      description: 'Deleted product',
      editor: editor,
      user_id: user.id,
      supabase: admin
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Product deleted successfully'
    });

  } catch (error: unknown) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
