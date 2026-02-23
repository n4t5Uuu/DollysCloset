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

    // Get product_ids from request
    const { product_ids } = await request.json();

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty product_ids array' }, { status: 400 });
    }

    const productIds = product_ids
      .map((id: unknown) => Number.parseInt(String(id), 10))
      .filter((id: number) => !Number.isNaN(id));

    if (productIds.length === 0) {
      return NextResponse.json({ error: 'No valid product_ids provided' }, { status: 400 });
    }

    // Fetch product images for cleanup
    const { data: images, error: imagesError } = await admin
      .from('tbl_product_image')
      .select('image_id, image_url')
      .in('product_id', productIds);

    if (imagesError) {
      console.error('Image fetch error:', imagesError);
      return NextResponse.json({ error: imagesError.message }, { status: 500 });
    }

    if (images && images.length > 0) {
      const { error: clearImageReferenceError } = await admin
        .from('tbl_product')
        .update({ image_id: null })
        .in('product_id', productIds);

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
        .in('product_id', productIds);

      if (imageDeleteError) {
        console.error('Image delete error:', imageDeleteError);
        return NextResponse.json({ error: imageDeleteError.message }, { status: 500 });
      }
    }

    // Delete from tbl_product
    const { error: deleteError } = await admin
      .from('tbl_product')
      .delete()
      .in('product_id', productIds);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Log activity for bulk delete
    await dataHelper.logActivity({
      actionType: 'delete_product',
      productId: null,
      description: `Bulk deleted ${product_ids.length} product(s)`,
      editor: editor,
      user_id: user.id,
      supabase: admin
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
