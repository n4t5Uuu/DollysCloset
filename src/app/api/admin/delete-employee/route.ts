import { NextRequest, NextResponse } from 'next/server';
import { authHelper } from "@/lib/auth-helper";
import { dataHelper } from "@/lib/data-helper";
import { admin } from "@/lib/supabase/admin";

/**
 * Handles the deletion of a single employee account.
 * Requires admin privileges via Bearer token authorization.
 * Both the Supabase Auth profile and the public `tbl_users` record are removed for the specified `employee_id`.
 * Logs the deletion activity.
 * @param request - The Next.js request object containing the authorization headers and the payload with `employee_id`.
 * @returns A JSON response indicating success status or error information.
 */
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

    // Check if user is admin
    const { data: userData, error: userError } = await authHelper.getUserRole(user.id, admin);

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
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(employee_id);

    if (deleteAuthError) {
      return NextResponse.json({ error: deleteAuthError.message }, { status: 500 });
    }

    // If cascade isn't working, manually delete from tbl_users
    const { error: deleteUserError } = await admin
      .from('tbl_users')
      .delete()
      .eq('user_id', employee_id);

    if (deleteUserError) {
      return NextResponse.json({ error: deleteUserError.message }, { status: 500 });
    }

    // Log activity
    await dataHelper.logActivity({
      actionType: 'delete_employee',
      productId: null,
      description: 'Deleted employee',
      editor: editor,
      user_id: user.id,
      supabase: admin
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Employee deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}