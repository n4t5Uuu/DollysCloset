import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@dollys-closet/core/lib/supabase/server";

export const metadata: Metadata = {
  title: "Account Activation",
  description: "Set up your secure password to activate your Dolly's Closet employee/admin account.",
};

export default async function SetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/");

  return <>{children}</>;
}
