// src/app/employee/layout.tsx
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import EmployeeSidebar from "@/components/employee/employee-sidebar";

export const dynamic = "force-dynamic";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/staff-login");

  // Check user role
  const { data: userData, error } = await supabase
    .from('tbl_users')
    .select('role')
    .eq('user_id', user.id)
    .single();

  // If user is admin, redirect to admin dashboard
  if (error || userData?.role === 'admin') {
    redirect('/admin/dashboard');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <EmployeeSidebar />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}