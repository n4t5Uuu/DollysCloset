import { NextRequest, NextResponse } from 'next/server';
import { authHelper } from "@/lib/auth-helper";
import { dataHelper } from "@/lib/data-helper";
import { admin } from "@/lib/supabase/admin";

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

    // Check if user is admin
    const { data: userData, error: userError } = await authHelper.getUserRole(user.id, admin);

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const editor = user.email || user.user_metadata?.username || 'Unknown';

    // Get product data from request
    const { product_id, product_name, category_id, product_price, product_brand, product_description, product_stock, product_condition, size_label, show_in_catalog, image_id } = await request.json();

    // Validate required fields
    if (!product_id || !product_name || !category_id || product_price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch current product to track changes
    const { data: currentProduct } = await admin
      .from('tbl_product')
      .select('*')
      .eq('product_id', product_id)
      .single();

    // Build change description
    const changes: string[] = [];
    if (currentProduct) {
      if (currentProduct.product_name !== product_name) changes.push(`name: ${currentProduct.product_name} → ${product_name}`);
      if (currentProduct.category_id !== category_id) changes.push(`category: ${currentProduct.category_id} → ${category_id}`);
      if (currentProduct.product_price !== parseFloat(product_price)) changes.push(`price: ${currentProduct.product_price} → ${product_price}`);
      if (currentProduct.product_brand !== (product_brand || 'Dolly\'s Closet')) changes.push(`brand: ${currentProduct.product_brand} → ${product_brand || 'Dolly\'s Closet'}`);
      if (currentProduct.product_description !== (product_description || '')) changes.push(`description updated`);
      if (currentProduct.product_stock !== parseInt(product_stock)) changes.push(`stock: ${currentProduct.product_stock} → ${product_stock}`);
      if (currentProduct.product_condition !== product_condition) changes.push(`condition: ${currentProduct.product_condition} → ${product_condition}`);
      if (currentProduct.size_label !== size_label) changes.push(`size: ${currentProduct.size_label} → ${size_label}`);
      if (currentProduct.show_in_catalog !== (show_in_catalog !== false)) changes.push(`visibility: ${currentProduct.show_in_catalog ? 'shown' : 'hidden'} → ${show_in_catalog !== false ? 'shown' : 'hidden'}`);
    }

    // Update tbl_product
    const { error: updateError } = await admin
      .from('tbl_product')
      .update({
        product_name,
        category_id,
        product_price: parseFloat(product_price),
        product_brand: product_brand || 'Dolly\'s Closet',
        product_description: product_description || '',
        product_stock: parseInt(product_stock) || 0,
        product_condition: product_condition || 'New',
        size_label: size_label || 'One Size',
        show_in_catalog: show_in_catalog !== false,
        image_id: image_id || null,
      })
      .eq('product_id', product_id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log activity
    await dataHelper.logActivity({
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

  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
