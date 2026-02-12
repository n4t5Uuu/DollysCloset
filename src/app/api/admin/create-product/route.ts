import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
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

    // Get product data from request
    const { product_name, category_id, product_price, product_brand, product_description, product_stock, product_condition, size_label, show_in_catalog, image_id } = await request.json();

    // Validate required fields
    if (!product_name || !category_id || product_price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert into tbl_product
    const { data: product, error: insertError } = await supabaseAdmin
      .from('tbl_product')
      .insert([
        {
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
        }
      ])
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      product: product?.[0]
    });

  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
