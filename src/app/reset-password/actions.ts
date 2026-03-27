"use server";

import { createServerSupabase } from "@/lib/supabase/server";

export async function updatePasswordAction(password: string): Promise<{ error: string | null }> {
  const supabase = await createServerSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "expired" };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("User-context update password error:", error.message);
    return { error: "Failed to update password. Please try again." };
  }

  // Invalidate all sessions so any stolen session cannot persist after a password change
  await supabase.auth.signOut({ scope: "global" }).catch(() => {});

  return { error: null };
}
