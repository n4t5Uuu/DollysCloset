import { NextRequest, NextResponse } from 'next/server';
import { authHelper } from "@/lib/auth-helper";
import { employeeHelper } from "@/lib/employees/employee-helper";
import { activityHelper } from "@/lib/activity/activity-helper";
import { admin } from "@/lib/supabase/admin";

/**
 * Handles the bulk deletion of employee accounts.
 * Requires admin privileges via Bearer token authorization.
 * Both the Supabase Auth profile and the public `tbl_users` record are removed for each specified ID.
 * Logs the deletion activity if successful.
 * @param request - The Next.js request object containing the authorization headers and the payload with `employee_ids`.
 * @returns A JSON response indicating the success status, number of deleted items, and failed items, or an error if invalid.
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

    // Get employee_ids from request
    const { employee_ids } = await request.json();

    if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty employee_ids array' }, { status: 400 });
    }

    // Delete employee accounts in bulk using employeeHelper
    const { error: deleteError, failures } = await employeeHelper.deleteEmployeesBulkAccount(employee_ids, admin);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // this logs the activity if the user is valid
    if (user) {
      const editor = user?.email || user?.user_metadata?.username || 'Unknown';
      await activityHelper.logActivity({
        actionType: 'delete_employee',
        productId: null,
        description: `Bulk deleted ${employee_ids.length} employee(s)`,
        editor: editor,
        user_id: user?.id,
        supabase: admin
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${employee_ids.length} employee(s)`,
      deleted_count: employee_ids.length,
      failed_count: failures.length
    });

  } catch (error: unknown) {
    console.error('Error bulk deleting employees:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}