// src/app/admin/layout.tsx
import AdminSidebar from "@/components/sidebar/AdminSidebar";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import ClientAuthGuard from "@/components/auth/ClientAuthGuard";
import { getServerAuthState } from "@/lib/auth-server";
import { buildLoginPath, buildUnauthorizedPath } from "@/lib/auth-routing";

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
        <div className="flex min-h-screen w-full bg-gray-50">
          <AdminSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            <div className="flex-1 p-8">
              {children}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ClientAuthGuard>
  );
}
