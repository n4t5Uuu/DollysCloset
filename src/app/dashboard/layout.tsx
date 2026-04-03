import { redirect } from "next/navigation";
import AdminSidebar from "@/components/sidebar/AdminSidebar";
import EmployeeSidebar from "@/components/sidebar/EmployeeSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import ClientAuthGuard from "@/components/ClientAuthGuard";
import { getServerAuthState } from "@/lib/auth/auth-server";
import { buildLoginPath, buildUnauthorizedPath } from "@/lib/auth/auth-routing";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const authState = await getServerAuthState();

    if (!authState.ok) redirect(buildLoginPath({ reason: authState.reason }));

    if (!authState.role) redirect(buildUnauthorizedPath("access-denied"));

    const Sidebar = authState.role === 'admin' ? AdminSidebar : authState.role === 'employee' ? EmployeeSidebar : null;

    if (!Sidebar) redirect(buildUnauthorizedPath("access-denied"));

    return (
        <ClientAuthGuard>
            <div className="flex min-h-screen w-full bg-gray-50 overflow-hidden">
                <Sidebar />
                <SidebarInset className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-4 pb-4 md:px-8 md:pb-8 pt-8 md:pt-8">
                        {children}
                    </div>
                </SidebarInset>
            </div>
        </ClientAuthGuard>
    );
}
