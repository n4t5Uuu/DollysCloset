import { NextRequest, NextResponse } from 'next/server';
import { authHelper } from "@/lib/auth-helper";
import { employeeHelper } from "@/lib/employees/employee-helper";
import { activityHelper } from "@/lib/activity/activity-helper";
import { admin } from "@/lib/supabase/admin";

/**
 * Registers a new employee user account and attaches initial authentication parameters.
 * Validates the calling account currently holds an admin role.
 * Links the newly minted Supabase Auth credential record to a metadata entry in `tbl_users` tagged with 'employee'.
 * @param request - The Next.js request containing auth headers and the payload details matching an employee login footprint.
 * @returns A JSON response displaying the `success: true` status alongside basic user credentials excluding exact passwords.
*/
export async function POST(request: NextRequest) {
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

    // Get employee data from request
    const { username, password, first_name, last_name } = await request.json();

    // Validate input
    if (!username || !password || !first_name || !last_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create employee account using employeeHelper
    const { data: employeeData, error: createError } = await employeeHelper.createEmployeeAccount({
      username,
      password,
      first_name,
      last_name
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
      description: `Created employee: ${first_name} ${last_name} (${username})`,
      editor: editor,
      user_id: user.id,
      supabase: admin
    });

    return NextResponse.json({ 
      success: true, 
      user: {
        id: employeeData?.id,
        username,
        first_name,
        last_name,
        role: 'employee'
      }
    });

  } catch (error: unknown) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}