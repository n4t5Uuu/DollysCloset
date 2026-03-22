import { NextRequest, NextResponse } from 'next/server';
import { authHelper } from "@/lib/auth-helper";
import { productHelper } from "@/lib/products/product-helper";
import { activityHelper } from "@/lib/activity/activity-helper";
import { admin } from "@/lib/supabase/admin";

const MAX_META_LENGTH = 9;

/**
 * Edits metadata properties corresponding to an existing catalog product record inside `tbl_product`.
 * Normalizes input string parameters such as sizing layout parameters cleanly beneath predefined constants.
 * Records the delta shift log comparing the initial status variables automatically onto the activity log table.
 * @param request - Next.js Request dictating the targeted `product_id` within the JSON alongside updated state configurations.
 * @returns Server response acknowledging database execution blocks or passing back system errors.
 */
export async function PUT(request: NextRequest) {
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

    // Get product data from request
    const { product_id, product_name, category_id, product_price, product_brand, product_description, product_stock, product_condition, size_label, show_in_catalog, image_id } = await request.json();
    const normalizedCondition = String(product_condition || 'New').trim().slice(0, MAX_META_LENGTH);
    const normalizedSizeLabel = String(size_label || 'One Size').trim().slice(0, MAX_META_LENGTH);

    // Validate required fields
    if (!product_id || !product_name || !category_id || product_price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch current product to track changes using productHelper
    const { data: currentProduct } = await productHelper.getProductById(product_id, admin);

    // Build change description
    const changes: string[] = [];
    if (currentProduct) {
      if (currentProduct.product_name !== product_name) changes.push(`name: ${currentProduct.product_name} → ${product_name}`);
      if (currentProduct.category_id !== category_id) changes.push(`category: ${currentProduct.category_id} → ${category_id}`);
      if (currentProduct.product_price !== parseFloat(product_price)) changes.push(`price: ${currentProduct.product_price} → ${product_price}`);
      if (currentProduct.product_brand !== (product_brand || 'Dolly\'s Closet')) changes.push(`brand: ${currentProduct.product_brand} → ${product_brand || 'Dolly\'s Closet'}`);
      if (currentProduct.product_description !== (product_description || '')) changes.push(`description updated`);
      if (currentProduct.product_stock !== parseInt(product_stock)) changes.push(`stock: ${currentProduct.product_stock} → ${product_stock}`);
      if (currentProduct.product_condition !== normalizedCondition) changes.push(`condition: ${currentProduct.product_condition} → ${normalizedCondition}`);
      if (currentProduct.size_label !== normalizedSizeLabel) changes.push(`size: ${currentProduct.size_label} → ${normalizedSizeLabel}`);
      if (currentProduct.show_in_catalog !== (show_in_catalog !== false)) changes.push(`visibility: ${currentProduct.show_in_catalog ? 'shown' : 'hidden'} → ${show_in_catalog !== false ? 'shown' : 'hidden'}`);
    }

    let normalizedImageId: string | number | null = null;
    if (image_id !== null && image_id !== undefined && String(image_id).trim() !== '') {
      const parsedImageId = Number.parseInt(String(image_id), 10);
      const imageIdValue = Number.isNaN(parsedImageId) ? String(image_id).trim() : parsedImageId;

      const { data: linkedImage, error: linkedImageError } = await productHelper.verifyProductImage(
        imageIdValue,
        product_id,
        admin
      );

      if (linkedImageError) {
        return NextResponse.json({ error: linkedImageError.message }, { status: 500 });
      }

      normalizedImageId = linkedImage?.image_id ?? null;
    }

    // Update tbl_product using productHelper
    const { error: updateError } = await productHelper.updateProduct(product_id, {
      product_name,
      category_id,
      product_price: parseFloat(product_price),
      product_brand: product_brand || "Dolly's Closet",
      product_description: product_description || '',
      product_stock: parseInt(product_stock) || 0,
      product_condition: normalizedCondition || 'New',
      size_label: normalizedSizeLabel || 'One Size',
      show_in_catalog: show_in_catalog !== false,
      image_id: normalizedImageId,
    }, admin);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log activity
    await activityHelper.logActivity({
      actionType: 'edit_product',
      productId: product_id,
      description: changes.length > 0 ? `Updated product "${product_name}": ${changes.join(', ')}` : `Updated product "${product_name}"`,
      editor: editor,
      user_id: user.id,
      supabase: admin
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Product updated successfully'
    });

  } catch (error: unknown) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
