"use server";

import { createServerSupabase } from "@/lib/supabase/server";
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

  return { error: null };
}
