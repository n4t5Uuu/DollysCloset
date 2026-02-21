import { admin } from '@/lib/supabase/admin';
import { authHelper } from '@/lib/auth-helper';
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: tokenError } = await admin.auth.getUser(token);
    if (tokenError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData, error: roleError } = await authHelper.getUserRole(user.id, admin);
    if (roleError || !['admin', 'employee'].includes(userData?.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await admin
      .from('tbl_activity_log')
      .select('log_id, created_at, action_type, product_id, description, editor, user_id')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching logs:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ data: data || [] })
    
  } catch (err: unknown) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}