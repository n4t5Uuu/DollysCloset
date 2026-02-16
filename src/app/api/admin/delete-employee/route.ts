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

    // Get employee_id from request
    const { employee_id } = await request.json();

    if (!employee_id) {
      return NextResponse.json({ error: 'Missing employee_id' }, { status: 400 });
    }

    // Delete auth user (this will cascade to tbl_users if foreign key is set up correctly)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(employee_id);

    if (deleteAuthError) {
      return NextResponse.json({ error: deleteAuthError.message }, { status: 500 });
    }

    // If cascade isn't working, manually delete from tbl_users
    const { error: deleteUserError } = await supabaseAdmin
      .from('tbl_users')
      .delete()
      .eq('user_id', employee_id);

    if (deleteUserError) {
      return NextResponse.json({ error: deleteUserError.message }, { status: 500 });
    }

    // Log activity
    await logActivity(
      supabaseAdmin,
      'delete_employee',
      null,
      'Deleted employee',
      editor,
      employee_id
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Employee deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}