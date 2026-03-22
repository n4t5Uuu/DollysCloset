import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { employeeHelper } from '@/lib/employees/employee-helper';

/**
 * Retrieves all registered staff records mapped inside the system's database.
 * Pulls explicitly from the `tbl_users` catalog containing metadata mapped back to the Supabase authentication.
 * @returns A JSON response array of user records outlining login footprints and descriptive names.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await employeeHelper.getUsers(supabase);
    
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