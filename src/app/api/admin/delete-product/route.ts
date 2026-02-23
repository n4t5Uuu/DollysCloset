import { NextRequest, NextResponse } from 'next/server';
import { authHelper } from "@/lib/auth-helper";
import { dataHelper } from "@/lib/data-helper";
import { admin } from "@/lib/supabase/admin";

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

    // Fetch product images for cleanup
    const { data: images, error: imagesError } = await admin
      .from('tbl_product_image')
      .select('image_id, image_url')
      .eq('product_id', productIdValue);

    if (imagesError) {
      console.error('Image fetch error:', imagesError);
      return NextResponse.json({ error: imagesError.message }, { status: 500 });
    }

    if (images && images.length > 0) {
      const { error: clearImageReferenceError } = await admin
        .from('tbl_product')
        .update({ image_id: null })
        .eq('product_id', productIdValue);

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

      const { error: imageDeleteError } = await admin
        .from('tbl_product_image')
        .delete()
        .eq('product_id', productIdValue);

      if (imageDeleteError) {
        console.error('Image delete error:', imageDeleteError);
        return NextResponse.json({ error: imageDeleteError.message }, { status: 500 });
      }
    }

    // Delete from tbl_product
    const { error: deleteError } = await admin
      .from('tbl_product')
      .delete()
      .eq('product_id', productIdValue);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Log activity
    await dataHelper.logActivity({
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
