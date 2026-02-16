import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { authHelper } from "@/lib/auth-helper";
import { dataHelper } from "@/lib/data-helper";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function DELETE(request: NextRequest) {
  try {
    // Verify the requesting user is an admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData, error: userError } = await authHelper.getUserRole(user.id, supabaseAdmin);

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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
    const { data: images, error: imagesError } = await supabaseAdmin
      .from('tbl_product_image')
      .select('image_id, image_url')
      .eq('product_id', productIdValue);

    if (imagesError) {
      console.error('Image fetch error:', imagesError);
      return NextResponse.json({ error: imagesError.message }, { status: 500 });
    }

    if (images && images.length > 0) {
      const filePaths = images
        .map((img) => img.image_url?.split('/').slice(-2).join('/'))
        .filter((path) => path);

      if (filePaths.length > 0) {
        await supabaseAdmin.storage.from('product-images').remove(filePaths);
      }

      const { error: imageDeleteError } = await supabaseAdmin
        .from('tbl_product_image')
        .delete()
        .eq('product_id', productIdValue);

      if (imageDeleteError) {
        console.error('Image delete error:', imageDeleteError);
        return NextResponse.json({ error: imageDeleteError.message }, { status: 500 });
      }
    }

    // Delete from tbl_product
    const { error: deleteError } = await supabaseAdmin
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
      user_id: user.id
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Product deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
