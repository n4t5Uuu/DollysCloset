import { NextResponse } from 'next/server';
import { employeeHelper } from '@/lib/employees/employee-helper';
import { requireRequestAuth } from '@/lib/auth/auth-server';
import { admin } from '@/lib/supabase/admin';

/**
 * Retrieves all registered staff records mapped inside the system's database.
 * Pulls explicitly from the `tbl_users` catalog containing metadata mapped back to the Supabase authentication.
 * @returns A JSON response array of user records outlining login footprints and descriptive names.
 */
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

    // Exclude the requesting admin's own account from the list so they
    // cannot accidentally (or intentionally) select and delete themselves.
    const filtered = (data || []).filter((u: { user_id: string }) => u.user_id !== authResult.user.id);

    return NextResponse.json({ data: filtered })
    
  } catch (err: unknown) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}
