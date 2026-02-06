// src/app/admin/layout.tsx
import AdminSidebar from "@/components/admin/admin-sidebar";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { dataHelper } from "@/lib/data-helper";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check user role
  const { data: userData, error } = await dataHelper.getUserRole(user.id, supabase);

  // If user is not admin, redirect to employee dashboard
  if (error || userData?.role !== 'admin') {
    redirect('/employee/dashboard');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}