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

    const editor = user.email || user.user_metadata?.username || 'Unknown';

    // Get category data from request
    const { category_name, category_description, parent_category } = await request.json();

    // Validate required fields
    if (!category_name) {
      return NextResponse.json({ error: 'Missing required field: category_name' }, { status: 400 });
    }

    // Insert into tbl_category
    const { data: category, error: insertError } = await supabaseAdmin
      .from('tbl_category')
      .insert([
        {
          category_name,
          category_description: category_description || '',
          parent_category: parent_category || null,
        }
      ])
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Log activity
    await logActivity(
      supabaseAdmin,
      'create_category',
      null,
      `Created category: ${category_name}`,
      editor
    );

    // Construct the category object to return immediately
    const newCategory = {
      category_name,
      category_description: category_description || '',
      parent_category: parent_category || null,
      category_id: category?.[0]?.category_id,
    };

    return NextResponse.json({ 
      success: true, 
      category: newCategory
    });

  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
