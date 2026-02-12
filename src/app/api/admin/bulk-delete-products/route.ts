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

    // Get product_ids from request
    const { product_ids } = await request.json();

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty product_ids array' }, { status: 400 });
    }

    // Delete from tbl_product
    const { error: deleteError } = await supabaseAdmin
      .from('tbl_product')
      .delete()
      .in('product_id', product_ids);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Log activity for bulk delete
    await logActivity(
      supabaseAdmin,
      'delete_product',
      null,
      `Bulk deleted ${product_ids.length} product(s)`
    );

    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${product_ids.length} product(s)`,
      deleted_count: product_ids.length
    });

  } catch (error: any) {
    console.error('Error bulk deleting products:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
