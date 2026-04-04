import { NextRequest, NextResponse } from 'next/server';
import { employeeHelper } from "@/lib/employees/employee-helper";
import { activityHelper } from "@/lib/activity/activity-helper";
import { createAdminClient } from "@dollys-closet/core/lib/supabase/admin";
import { requireRequestAuth } from "@/lib/auth/auth-server";

const MAX_BULK_DELETE_EMPLOYEES = 100;

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
    const authResult = await requireRequestAuth(request, {
      allowedRoles: ["admin"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { user } = authResult;
    // Get employee_ids from request
    const { employee_ids } = await request.json();

    if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty employee_ids array' }, { status: 400 });
    }

    if (employee_ids.length > MAX_BULK_DELETE_EMPLOYEES) {
      return NextResponse.json(
        { error: `You can delete up to ${MAX_BULK_DELETE_EMPLOYEES} employees at a time.` },
        { status: 400 }
      );
    }

    if (employee_ids.includes(user.id)) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();

    // Delete employee accounts in bulk using employeeHelper
    const { failures, deletedIds } = await employeeHelper.deleteEmployeesBulkAccount(employee_ids, supabaseAdmin);

    // this logs the activity if the user is valid
    if (user) {
      const editor = user?.email || user?.user_metadata?.username || 'Unknown';
      await activityHelper.logActivity({
        actionType: 'delete_employee',
        productId: null,
        description: `Bulk deleted ${deletedIds.length} employee(s)`,
        editor: editor,
        user_id: user?.id,
        supabase: supabaseAdmin
      });
    }

    const failedIds = failures.map((failure) => failure.employeeId);
    const status = failures.length > 0 ? 207 : 200;

    return NextResponse.json({ 
      success: failures.length === 0,
      message: failures.length > 0
        ? `Deleted ${deletedIds.length} employee(s) with ${failures.length} failure(s)`
        : `Successfully deleted ${deletedIds.length} employee(s)`,
      deleted_count: deletedIds.length,
      deleted_ids: deletedIds,
      failed_count: failures.length,
      failed_ids: failedIds,
      failures,
    }, { status });

  } catch (error: unknown) {
    console.error('Error bulk deleting employees:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
