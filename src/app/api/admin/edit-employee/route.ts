import {supabaseAdmin} from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from 'next/server';


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

    // Get employee data from request
    const { employee_id, username, first_name, last_name, password } = await request.json();

    // Validate input
    if (!employee_id || !username || !first_name || !last_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
      console.error("Update Error: ", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update password if provided
    if (password) {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        employee_id,
        { password: password }
      );

      if (passwordError) {
        console.error("Password Error: ", passwordError)
        return NextResponse.json({ error: passwordError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Employee updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}