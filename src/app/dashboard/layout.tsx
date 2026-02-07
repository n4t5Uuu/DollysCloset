import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import AdminSidebar from "@/components/admin/admin-sidebar";
import EmployeeSidebar from "@/components/employee/employee-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { dataHelper } from "@/lib/data-helper";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: userData, error } = await dataHelper.getUserRole(user.id, supabase);

    if (error || !userData) redirect("/login");

    if (userData.role === 'admin') {
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
    } else if (userData.role === 'employee') {
        return (
            <SidebarProvider>
            <div className="flex min-h-screen w-full bg-gray-50">
                <EmployeeSidebar />
                <SidebarInset className="flex-1 p-8">
                {children}
                </SidebarInset>
            </div>
            </SidebarProvider>
        );
    } else {
        redirect("/");
    }
}
