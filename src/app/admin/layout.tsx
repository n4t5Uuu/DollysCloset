// src/app/admin/layout.tsx
import AdminSidebar from "@/components/sidebar/AdminSidebar";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import ClientAuthGuard from "@/components/auth/ClientAuthGuard";
import { getServerAuthState } from "@/lib/auth/auth-server";
import { buildLoginPath, buildUnauthorizedPath } from "@/lib/auth/auth-routing";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authState = await getServerAuthState();

  if (!authState.ok) {
    redirect(buildLoginPath({ reason: authState.reason }));
  }

  if (authState.role !== "admin") {
    redirect(authState.role === "employee" ? "/dashboard" : buildUnauthorizedPath("access-denied"));
  }

  return (
    <ClientAuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-gray-50 overflow-hidden">
          <AdminSidebar />
          <SidebarInset className="flex flex-1 flex-col overflow-hidden">
            <header className="flex h-14 items-center gap-2 border-b bg-white px-4 md:hidden">
              <SidebarTrigger className="-ml-1" />
              <span className="font-semibold text-sm">Menu</span>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              {children}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ClientAuthGuard>
  );
}
