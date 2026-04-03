import { NextRequest, NextResponse } from 'next/server';
import { employeeHelper } from "@/lib/employees/employee-helper";
import { activityHelper } from "@/lib/activity/activity-helper";
import { admin } from "@/lib/supabase/admin";
import { requireRequestAuth } from "@/lib/auth/auth-server";
import {
  sanitizeSingleLineText,
  schemaExactLimits,
} from "@/lib/input-sanitization";

export async function GET(request: Request) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowCookieAuth: true,
      allowedRoles: ["admin"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { data, error } = await employeeHelper.getUsers(admin);

    if (error) {
      console.error('Error fetching employees:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [] })

  } catch (err: unknown) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

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

    const { username, password, first_name, last_name } = await request.json();
    const normalizedUsername = sanitizeSingleLineText(username, schemaExactLimits.userUsername).toLowerCase();
    const normalizedFirstName = sanitizeSingleLineText(first_name, schemaExactLimits.userFirstName);
    const normalizedLastName = sanitizeSingleLineText(last_name, schemaExactLimits.userLastName);

    if (!normalizedUsername || !password || !normalizedFirstName || !normalizedLastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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

    const { employee_id, username, first_name, last_name, password } = await request.json();
    const normalizedUsername = sanitizeSingleLineText(username, schemaExactLimits.userUsername).toLowerCase();
    const normalizedFirstName = sanitizeSingleLineText(first_name, schemaExactLimits.userFirstName);
    const normalizedLastName = sanitizeSingleLineText(last_name, schemaExactLimits.userLastName);

    if (!employee_id || !normalizedUsername || !normalizedFirstName || !normalizedLastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: currentEmployee } = await employeeHelper.getUserById(employee_id, admin);

    const changes: string[] = [];
    if (currentEmployee) {
      if (currentEmployee.username !== username) changes.push(`username: ${currentEmployee.username} → ${username}`);
      if (currentEmployee.first_name !== first_name) changes.push(`first name: ${currentEmployee.first_name} → ${first_name}`);
      if (currentEmployee.last_name !== last_name) changes.push(`last name: ${currentEmployee.last_name} → ${last_name}`);
      if (password) changes.push(`password changed`);
    }

    const { error: updateError } = await employeeHelper.updateEmployeeAccount(employee_id, {
      username: normalizedUsername,
      first_name: normalizedFirstName,
      last_name: normalizedLastName,
      password
    }, admin);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await activityHelper.logActivity({
      actionType: 'edit_employee',
      productId: null,
      description: changes.length > 0 ? `Updated employee "${normalizedFirstName} ${normalizedLastName}": ${changes.join(', ')}` : `Updated employee "${normalizedFirstName} ${normalizedLastName}"`,
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

    const { employee_id } = await request.json();

    if (!employee_id) {
      return NextResponse.json({ error: 'Missing employee_id' }, { status: 400 });
    }

    if (employee_id === user.id) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 403 });
    }

    const { error: deleteError } = await employeeHelper.deleteEmployeeAccount(employee_id, admin);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

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
