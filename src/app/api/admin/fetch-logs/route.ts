import { admin } from '@/lib/supabase/admin';
import { authHelper } from '@/lib/auth/auth-helper';
import { activityHelper } from '@/lib/activity/activity-helper';
import { createServerSupabase } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server'

/**
 * Queries the `tbl_activity_log` for tracking historical changes made via staff across the application.
 * Rejects requests failing initial token authentication checks and role constraints (admin or employee roles).
 * Organizes returns chronologically, newest logs rendered initially.
 * @param request - Next.js Request populated naturally with Bearer authorization credentials protecting metrics.
 * @returns Readily formed UI-bound list item tracking activity blocks matching exact historical inputs.
 */
export async function GET(request: NextRequest) {
  try {
    let userId: string | null = null;

    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: tokenError } = await admin.auth.getUser(token);
      if (!tokenError && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      const supabase = await createServerSupabase();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id;
    }

    const { data: userData, error: roleError } = await authHelper.getUserRole(userId, admin);
    if (roleError || !['admin', 'employee'].includes(userData?.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') ?? '10', 10)));
    const search = searchParams.get('search') ?? '';
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');
    const actionTypesParam = searchParams.get('actionTypes');

    const month = monthParam !== null ? parseInt(monthParam, 10) : undefined;
    const year = yearParam !== null ? parseInt(yearParam, 10) : undefined;
    const actionTypes = actionTypesParam ? actionTypesParam.split(',').filter(Boolean) : [];

    const { data, count, error } = await activityHelper.fetchLogsPaginated(admin, {
      page, pageSize, search, month, year, actionTypes,
    });

    if (error) {
      console.error('Error fetching logs:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data || [], count: count ?? 0 })
    
  } catch (err: unknown) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}