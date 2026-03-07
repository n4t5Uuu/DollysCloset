import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server'

/**
 * Retrieves the comprehensive raw list of all defined products presently published onto `tbl_product`.
 * Fetched completely unbound via a direct native database interface bypassing complex joins.
 * @returns Unmodified base mapping JSON response bridging available raw metadata.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    
    // Optional: Add auth check
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    // if (authError || !user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    
    const { data, error } = await supabase
      .from('tbl_product')
      .select('*')
    
    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ data: data || [] })
    
  } catch (err: unknown) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}