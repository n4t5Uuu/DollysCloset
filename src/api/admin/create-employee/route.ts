import {supabaseAdmin} from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Verify the requesting user is an admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log("Auth Header: ", authHeader)
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
      console.error("User Error: ", userError);
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get employee data from request
    const { username, password, first_name, last_name } = await request.json();

    // Validate input
    if (!username || !password || !first_name || !last_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create auth user using Admin API
    const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
      email: username,
      password: password,
      email_confirm: true,
      user_metadata: {
        username: username
      }
    });

    if (error) {
      console.error("Error: ", error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Update tbl_users with additional info
    const { error: updateError } = await supabaseAdmin
      .from('tbl_users')
      .update({
        username: username,
        first_name: first_name,
        last_name: last_name,
        role: 'employee',
      })
      .eq('user_id', authData.user.id);

    if (updateError) {
      // Rollback: delete auth user if update fails
      console.error("Update Error: ", updateError)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

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

  } catch (error: any) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}