"use server";

import { createServerSupabase } from "@/lib/supabase/server";

export async function changePasswordAction(newPassword: string): Promise<{ error: string | null }> {
  const supabase = await createServerSupabase();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "Session expired. Please log in again." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    console.error("Change password error:", error.message);
    return { error: "Failed to update password. Please try again." };
  }

  // Revoke all other sessions so any stolen sessions are immediately invalidated.
  // scope: "others" keeps the current session alive.
  await supabase.auth.signOut({ scope: "others" }).catch(() => {});

  return { error: null };
}
