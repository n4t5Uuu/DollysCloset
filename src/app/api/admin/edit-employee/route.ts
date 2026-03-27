import { NextRequest, NextResponse } from 'next/server';
import { employeeHelper } from "@/lib/employees/employee-helper";
import { activityHelper } from "@/lib/activity/activity-helper";
import { admin } from "@/lib/supabase/admin";
import { requireRequestAuth } from "@/lib/auth/auth-server";

/**
 * Handles modification logic surrounding existing employee accounts on the system.
 * Modifiable footprints belong strictly to `tbl_users` data properties natively and Supabase explicit passwords.
 * Generates an automated breakdown summarizing exactly what keys changed within the unified logs table.
 * @param request - The Next.js request housing the Bearer auth block and JSON payloads containing names, IDs, or passwords.
 * @returns A JSON string responding neutrally positive upon execution or throwing exceptions natively.
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowedRoles: ["admin"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { user } = authResult;
    const editor = user.email || user.user_metadata?.username || 'Unknown';

    // Get employee data from request
    const { employee_id, username, first_name, last_name, password } = await request.json();

    // Validate input
    if (!employee_id || !username || !first_name || !last_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch current employee to track changes using employeeHelper
    const { data: currentEmployee } = await employeeHelper.getUserById(employee_id, admin);

    // Build change description
    const changes: string[] = [];
    if (currentEmployee) {
      if (currentEmployee.username !== username) changes.push(`username: ${currentEmployee.username} → ${username}`);
      if (currentEmployee.first_name !== first_name) changes.push(`first name: ${currentEmployee.first_name} → ${first_name}`);
      if (currentEmployee.last_name !== last_name) changes.push(`last name: ${currentEmployee.last_name} → ${last_name}`);
      if (password) changes.push(`password changed`);
    }

    // Update employee profile & password using employeeHelper
    const { error: updateError } = await employeeHelper.updateEmployeeAccount(employee_id, {
      username,
      first_name,
      last_name,
      password
    }, admin);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log activity
    await activityHelper.logActivity({
      actionType: 'edit_employee',
      productId: null,
      description: changes.length > 0 ? `Updated employee "${first_name} ${last_name}": ${changes.join(', ')}` : `Updated employee "${first_name} ${last_name}"`,
      editor: editor,
      user_id: user.id,
      supabase: admin
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Employee updated successfully'
    });

  } catch (error: unknown) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
