// src/app/admin/layout.tsx
import AdminSidebar from "@/components/admin/admin-sidebar";
import { redirect } from "next/navigation";
import { authHelper } from "@/lib/auth-helper";
import { createServerSupabase } from "@/lib/supabase/server";
import { dataHelper } from "@/lib/data-helper";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

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
  const { data: userData, error } = await authHelper.getUserRole(user.id, supabase);

  // If user is not admin, redirect to employee dashboard
  if (error || userData?.role !== 'admin') {
    redirect('/employee/dashboard');
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50">
        <AdminSidebar />
        <SidebarInset className="flex-1 p-8">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}