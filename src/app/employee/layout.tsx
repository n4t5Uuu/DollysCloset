// src/app/employee/layout.tsx
import { redirect } from "next/navigation";
import { authHelper } from "@/lib/auth-helper";
import { createServerSupabase } from "@/lib/supabase/server";
import EmployeeSidebar from "@/components/sidebar/EmployeeSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import ClientAuthGuard from "@/components/auth/ClientAuthGuard";


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

  if (!user) redirect("/unauthorized");

  // Check user role
  const { data: userData, error } = await authHelper.getUserRole(user.id, supabase);

  // If user is admin, redirect to admin dashboard
  if (error || userData?.role === 'admin') {
    redirect('/admin/dashboard');
  }

  return (
    <ClientAuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-gray-50">
          <EmployeeSidebar />
          <SidebarInset className="flex-1 p-8">
            {children}
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ClientAuthGuard>
  );
}