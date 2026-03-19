import { NextRequest, NextResponse } from 'next/server';
import { authHelper } from "@/lib/auth-helper";
import { dataHelper } from "@/lib/data-helper";
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

    // Create auth user using Admin API
    const { data: authData, error: createError } = await admin.auth.admin.createUser({
      email: username,
      password: password,
      email_confirm: true,
      user_metadata: {
        username: username
      }
    });

    if (createError) {
      console.error('Auth User Creation Error:', createError);
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    if (!authData.user) {
      console.error('Failed to create auth user object');
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Update tbl_users with additional info
    const { error: updateError } = await admin
      .from('tbl_users')
      .update({
        username: username,
        first_name: first_name,
        last_name: last_name,
        role: 'employee',
      })
      .eq('user_id', authData.user.id);

    if (updateError) {
      console.error('Employee metadata update error:', updateError);
      // Rollback: delete auth user if update fails
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log activity
    await dataHelper.logActivity({
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
        id: authData.user.id,
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