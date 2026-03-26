import { NextRequest, NextResponse } from 'next/server';
import { employeeHelper } from "@/lib/employees/employee-helper";
import { activityHelper } from "@/lib/activity/activity-helper";
import { admin } from "@/lib/supabase/admin";
import { requireRequestAuth } from "@/lib/auth-server";

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
    const authResult = await requireRequestAuth(request, {
      allowedRoles: ["admin"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { user } = authResult;
    const editor = user.email || user.user_metadata?.username || 'Unknown';

    // Get employee_id from request
    const { employee_id } = await request.json();

    if (!employee_id) {
      return NextResponse.json({ error: 'Missing employee_id' }, { status: 400 });
    }

    // Delete employee account using employeeHelper
    const { error: deleteError } = await employeeHelper.deleteEmployeeAccount(employee_id, admin);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Log activity
    await activityHelper.logActivity({
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

  } catch (error: unknown) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
