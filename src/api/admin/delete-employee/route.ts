import {supabaseAdmin} from '@/lib/supabase/admin'; 
import { NextRequest, NextResponse } from 'next/server';

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
      console.error("Auth Error: ", authError)
      console.log("User: ", user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('tbl_users')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userError || userData?.role !== 'admin') {
      console.error("User Error: ", userError)
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get employee_id from request
    const { employee_id } = await request.json();

    if (!employee_id) {
      return NextResponse.json({ error: 'Missing employee_id' }, { status: 400 });
    }

    // Delete auth user (this will cascade to tbl_users if foreign key is set up correctly)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(employee_id);

    if (deleteAuthError) {
      console.error("Delete Auth Error: ", deleteAuthError)
      return NextResponse.json({ error: deleteAuthError.message }, { status: 500 });
    }

    // If cascade isn't working, manually delete from tbl_users
    const { error: deleteUserError } = await supabaseAdmin
      .from('tbl_users')
      .delete()
      .eq('user_id', employee_id);

    if (deleteUserError) {
      console.error("Delete User Error: ", deleteUserError)
      return NextResponse.json({ error: deleteUserError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Employee deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}