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

    // Get employee_ids from request
    const { employee_ids } = await request.json();

    if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty employee_ids array' }, { status: 400 });
    }

    // Delete auth users one by one (Supabase admin API doesn't support bulk delete)
    const deletePromises = employee_ids.map(id => 
      supabaseAdmin.auth.admin.deleteUser(id)
    );

    const results = await Promise.allSettled(deletePromises);
    
    // Check for any failures
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.error('Some deletions failed:', failures);
    }

    // Delete from tbl_users (in case cascade didn't work)
    const { error: deleteUserError } = await supabaseAdmin
      .from('tbl_users')
      .delete()
      .in('user_id', employee_ids);

    if (deleteUserError) {
      return NextResponse.json({ error: deleteUserError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${employee_ids.length} employee(s)`,
      deleted_count: employee_ids.length,
      failed_count: failures.length
    });

  } catch (error: any) {
    console.error('Error bulk deleting employees:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}