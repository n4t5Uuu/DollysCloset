import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    
    // Optional: Add auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data, error } = await supabase
      .from('tbl_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching logs:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ data: data || [] })
    
  } catch (err: any) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}