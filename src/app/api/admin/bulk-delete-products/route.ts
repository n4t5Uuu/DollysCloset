import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { dataHelper } from "@/lib/data-helper";
import { logActivity } from "@/lib/activity-logger";

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
    const { data: userData, error: userError } = await dataHelper.getUserRole(user.id, supabaseAdmin);

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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
    const { data: images, error: imagesError } = await supabaseAdmin
      .from('tbl_product_image')
      .select('image_id, image_url')
      .in('product_id', productIds);

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
        .in('product_id', productIds);

      if (imageDeleteError) {
        console.error('Image delete error:', imageDeleteError);
        return NextResponse.json({ error: imageDeleteError.message }, { status: 500 });
      }
    }

    // Delete from tbl_product
    const { error: deleteError } = await supabaseAdmin
      .from('tbl_product')
      .delete()
      .in('product_id', productIds);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Log activity for bulk delete
    await logActivity(
      supabaseAdmin,
      'delete_product',
      null,
      `Bulk deleted ${productIds.length} product(s)`,
      editor
    );

    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${productIds.length} product(s)`,
      deleted_count: productIds.length
    });

  } catch (error: any) {
    console.error('Error bulk deleting products:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
