import { NextRequest, NextResponse } from 'next/server';
import { authHelper } from "@/lib/auth-helper";
import { productHelper } from "@/lib/products/product-helper";
import { activityHelper } from "@/lib/activity/activity-helper";
import { admin } from "@/lib/supabase/admin";

const MAX_META_LENGTH = 9;

/**
 * Submits metadata properties encapsulating a brand-new catalog product into the database mapping `tbl_product`.
 * Constrains meta variables explicitly inside system bounds (e.g., maximum string layouts for arbitrary labels).
 * Can be conducted by either administrative or standard 'employee' authenticated profiles.
 * @param request - The Next.js Request specifying category relationships, cost parameters, and arbitrary flags formatted as JSON.
 * @returns Response reporting the specific `product_id` and values injected natively inside DB if operations clear.
 */
export async function POST(request: NextRequest) {
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
    const { product_name, category_id, product_price, product_brand, product_description, product_stock, product_condition, size_label, show_in_catalog, image_id } = await request.json();
    const normalizedCondition = String(product_condition || 'New').trim().slice(0, MAX_META_LENGTH);
    const normalizedSizeLabel = String(size_label || 'One Size').trim().slice(0, MAX_META_LENGTH);

    // Validate required fields
    if (!product_name || !category_id || product_price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert into tbl_product using productHelper
    const { data: product, error: insertError } = await productHelper.createProduct({
      product_name,
      category_id,
      product_price: parseFloat(product_price),
      product_brand: product_brand || "Dolly's Closet",
      product_description: product_description || '',
      product_stock: parseInt(product_stock) || 0,
      product_condition: normalizedCondition || 'New',
      size_label: normalizedSizeLabel || 'One Size',
      show_in_catalog: show_in_catalog !== false,
      image_id: image_id || null,
    }, admin);

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Log activity
    if (product) {
      await activityHelper.logActivity({
        actionType: 'create_product',
        productId: product.product_id,
        description: `Created product: ${product_name}`,
        editor: editor,
        user_id: user.id,
        supabase: admin
      });
    }

    return NextResponse.json({ 
      success: true, 
      product: product
    });

  } catch (error: unknown) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
