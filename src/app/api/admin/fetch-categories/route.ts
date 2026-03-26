import { NextResponse } from 'next/server';
import { productHelper } from '@/lib/products/product-helper';
import { requireRequestAuth } from '@/lib/auth-server';
import { admin } from '@/lib/supabase/admin';

/**
 * Retrieves the complete list of available product categories.
 * Queries the database table `tbl_category` directly via the server-side Supabase client.
 * @returns A structured JSON response containing the category data properties mappings.
 */
export async function GET(request: Request) {
  try {
    const authResult = await requireRequestAuth(request, {
      allowCookieAuth: true,
      allowedRoles: ["admin", "employee"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { data, error } = await productHelper.getCategories(admin);
    
    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ data: data || [] })
    
  } catch (err: unknown) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
