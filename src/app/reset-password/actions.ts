"use server";

import { createServerSupabase } from "@/lib/supabase/server";
<<<<<<< Updated upstream

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

=======
import { admin } from "@/lib/supabase/admin";

export async function updatePasswordAction(password: string): Promise<{ error: string | null }> {
  const supabase = await createServerSupabase();

  // getSession reads from cookies locally — no network round-trip needed
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { error: "expired" };
  }

  const { error } = await admin.auth.admin.updateUserById(session.user.id, { password });

  if (error) {
    console.error("Admin updateUserById error:", error);
    return { error: "Failed to update password. Please try again." };
  }

>>>>>>> Stashed changes
  return { error: null };
}
