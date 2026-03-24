import { redirect } from "next/navigation";
import { authHelper } from "@/lib/auth-helper";
import { createServerSupabase } from "@/lib/supabase/server";
import AdminSidebar from "@/components/sidebar/AdminSidebar";
import EmployeeSidebar from "@/components/sidebar/EmployeeSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import ClientAuthGuard from "@/components/auth/ClientAuthGuard";
import LogoutButton from "@/components/general-components/LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/unauthorized");

    const { data: userData, error } = await authHelper.getUserRole(user.id, supabase);

    if (error || !userData) redirect("/unauthorized");

    if (userData.role === 'admin') {
        return (
            <ClientAuthGuard>
                <SidebarProvider>
                <div className="flex min-h-screen w-full bg-gray-50">
                    <AdminSidebar />
                    <SidebarInset className="flex-1 flex flex-col">
                        <header className="flex items-center justify-end px-8 py-4 border-b border-gray-200 bg-white">
                            <LogoutButton />
                        </header>
                        <div className="flex-1 p-8">
                            {children}
                        </div>
                    </SidebarInset>
                </div>
                </SidebarProvider>
            </ClientAuthGuard>
        );
    } else if (userData.role === 'employee') {
        return (
            <ClientAuthGuard>
                <SidebarProvider>
                <div className="flex min-h-screen w-full bg-gray-50">
                    <EmployeeSidebar />
                    <SidebarInset className="flex-1 flex flex-col">
                        <header className="flex items-center justify-end px-8 py-4 border-b border-gray-200 bg-white">
                            <LogoutButton />
                        </header>
                        <div className="flex-1 p-8">
                            {children}
                        </div>
                    </SidebarInset>
                </div>
                </SidebarProvider>
            </ClientAuthGuard>
        );
    } else {
        redirect("/");
    }
}
