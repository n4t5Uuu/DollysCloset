import { SupabaseClient } from '@supabase/supabase-js';

export async function logActivity(
  supabaseAdmin: SupabaseClient,
  action_type: string,
  product_id: number | null = null,
  description: string = ''
) {
  try {
    const { error } = await supabaseAdmin
      .from('tbl_activity_log')
      .insert([
        {
          action_type,
          product_id,
          description,
          created_at: new Date().toISOString(),
        }
      ]);

    if (error) {
      console.error('Error logging activity:', error);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Activity logging error:', err);
    return false;
  }
}
