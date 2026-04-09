import { redirect } from "next/navigation";
import AdminSidebar from "@/components/sidebar/AdminSidebar";
import EmployeeSidebar from "@/components/sidebar/EmployeeSidebar";
import { SidebarInset } from "@dollys-closet/ui";
import ClientAuthGuard from "@/components/ClientAuthGuard";
import { getServerAuthState } from "@/lib/auth/auth-server";
import { buildLoginPath, buildUnauthorizedPath } from "@/lib/auth/auth-routing";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Admin Dashboard",
    description: "Manage Dolly's Closet inventory, view analytics, and handle boutique operations.",
    robots: {
        index: false,
        follow: false,
    },
};

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
                <SidebarInset className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <div className="flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4 pt-8 md:px-8 md:pb-8 md:pt-8">
                        {children}
                    </div>
                </SidebarInset>
            </div>
        </ClientAuthGuard>
    );
}
