import { admin } from '@/lib/supabase/admin';
import { activityHelper } from '@/lib/activity/activity-helper';
import { requireRequestAuth } from '@/lib/auth/auth-server';
import { NextRequest, NextResponse } from 'next/server'

/**
 * Queries the `tbl_activity_log` for tracking historical changes made via staff across the application.
 * Admins may read the full feed; employees are restricted to their own activity only.
 * Organizes returns chronologically, newest logs rendered initially.
 * @param request - Next.js Request populated naturally with Bearer authorization credentials protecting metrics.
 * @returns Readily formed UI-bound list item tracking activity blocks matching exact historical inputs.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowCookieAuth: true,
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
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

    const scopedUserId = authResult.role === "employee" ? authResult.user.id : undefined;

    const [{ data, count, error }, { data: availableMonths, error: monthsError }] = await Promise.all([
      activityHelper.fetchLogsPaginated(admin, {
        page,
        pageSize,
        search,
        month,
        year,
        actionTypes,
        userId: scopedUserId,
      }),
      activityHelper.fetchAvailableLogMonths(admin, {
        userId: scopedUserId,
      }),
    ]);

    if (error) {
      console.error('Error fetching logs:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (monthsError) {
      console.error('Error fetching log months:', monthsError)
      return NextResponse.json(
        { error: monthsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
      count: count ?? 0,
      availableMonths: availableMonths || [],
    })
    
  } catch (err: unknown) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}
