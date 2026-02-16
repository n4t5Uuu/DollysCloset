import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { authHelper } from "@/lib/auth-helper";
import { dataHelper } from "@/lib/data-helper";

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

export async function PUT(request: NextRequest) {
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
    const { data: userData, error: userError } = await authHelper.getUserRole(user.id, supabaseAdmin);

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const editor = user.email || user.user_metadata?.username || 'Unknown';

    // Get employee data from request
    const { employee_id, username, first_name, last_name, password } = await request.json();

    // Validate input
    if (!employee_id || !username || !first_name || !last_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch current employee to track changes
    const { data: currentEmployee } = await supabaseAdmin
      .from('tbl_users')
      .select('*')
      .eq('user_id', employee_id)
      .single();

    // Build change description
    const changes: string[] = [];
    if (currentEmployee) {
      if (currentEmployee.username !== username) changes.push(`username: ${currentEmployee.username} → ${username}`);
      if (currentEmployee.first_name !== first_name) changes.push(`first name: ${currentEmployee.first_name} → ${first_name}`);
      if (currentEmployee.last_name !== last_name) changes.push(`last name: ${currentEmployee.last_name} → ${last_name}`);
      if (password) changes.push(`password changed`);
    }

    // Update tbl_users
    const { error: updateError } = await supabaseAdmin
      .from('tbl_users')
      .update({
        username: username,
        first_name: first_name,
        last_name: last_name,
      })
      .eq('user_id', employee_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update password if provided
    if (password) {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        employee_id,
        { password: password }
      );

      if (passwordError) {
        return NextResponse.json({ error: passwordError.message }, { status: 500 });
      }
    }

    // Log activity
    await dataHelper.logActivity({
      actionType: 'edit_employee',
      productId: null,
      description: changes.length > 0 ? `Updated employee "${first_name} ${last_name}": ${changes.join(', ')}` : `Updated employee "${first_name} ${last_name}"`,
      editor: editor,
      user_id: employee_id
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Employee updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}