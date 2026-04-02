import { NextRequest, NextResponse } from 'next/server';
import { employeeHelper } from "@/lib/employees/employee-helper";
import { activityHelper } from "@/lib/activity/activity-helper";
import { admin } from "@/lib/supabase/admin";
import { requireRequestAuth } from "@/lib/auth/auth-server";
import {
  sanitizeSingleLineText,
  schemaExactLimits,
} from "@/lib/input-sanitization";

/**
 * Registers a new employee user account and attaches initial authentication parameters.
 * Validates the calling account currently holds an admin role.
 * Links the newly minted Supabase Auth credential record to a metadata entry in `tbl_users` tagged with 'employee'.
 * @param request - The Next.js request containing auth headers and the payload details matching an employee login footprint.
 * @returns A JSON response displaying the `success: true` status alongside basic user credentials excluding exact passwords.
*/
export async function POST(request: NextRequest) {
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
    const { username, password, first_name, last_name } = await request.json();
    const normalizedUsername = sanitizeSingleLineText(username, schemaExactLimits.userUsername).toLowerCase();
    const normalizedFirstName = sanitizeSingleLineText(first_name, schemaExactLimits.userFirstName);
    const normalizedLastName = sanitizeSingleLineText(last_name, schemaExactLimits.userLastName);

    // Validate input
    if (!normalizedUsername || !password || !normalizedFirstName || !normalizedLastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create employee account using employeeHelper
    const { data: employeeData, error: createError } = await employeeHelper.createEmployeeAccount({
      username: normalizedUsername,
      password,
      first_name: normalizedFirstName,
      last_name: normalizedLastName
    }, admin);

    if (createError) {
      console.error('Employee creation error:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Since metadata is linked successfully inside helper, we can proceed to log activity directly

    // Log activity
    await activityHelper.logActivity({
      actionType: 'create_employee',
      productId: null,
      description: `Created employee: ${normalizedFirstName} ${normalizedLastName} (${normalizedUsername})`,
      editor: editor,
      user_id: user.id,
      supabase: admin
    });

    return NextResponse.json({ 
      success: true, 
      user: {
        id: employeeData?.id,
        username: normalizedUsername,
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        role: 'employee'
      }
    });

  } catch (error: unknown) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
