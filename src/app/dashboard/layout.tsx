import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import AdminSidebar from "@/components/admin/admin-sidebar";
import EmployeeSidebar from "@/components/employee/employee-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: userData, error } = await supabase
        .from('tbl_users')
        .select('role')
        .eq('user_id', user.id)
        .single();

    if (error || !userData) redirect("/login");

    if (userData.role === 'admin') {
        return (
            <div className="flex min-h-screen bg-gray-50">
                <AdminSidebar />
                <main className="flex-1 p-8">
                    {children}
                </main>
            </div>
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
