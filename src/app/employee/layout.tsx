// src/app/employee/layout.tsx
import { redirect } from "next/navigation";
import EmployeeSidebar from "@/components/sidebar/EmployeeSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import ClientAuthGuard from "@/components/auth/ClientAuthGuard";
<<<<<<< Updated upstream
import { getServerAuthState } from "@/lib/auth-server";
import { buildLoginPath, buildUnauthorizedPath } from "@/lib/auth-routing";
=======
import LogoutButton from "@/components/general-components/LogoutButton";
>>>>>>> Stashed changes


export const dynamic = "force-dynamic";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authState = await getServerAuthState();

  // Only employees may continue into this branch.
  if (!authState.ok) {
    redirect(buildLoginPath({ reason: authState.reason }));
  }

  if (authState.role !== "employee") {
    redirect(authState.role === "admin" ? "/dashboard" : buildUnauthorizedPath("access-denied"));
  }

  return (
    <ClientAuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-gray-50">
          <EmployeeSidebar />
          <SidebarInset className="flex-1 flex flex-col">
<<<<<<< Updated upstream
=======
            <header className="flex items-center justify-end px-8 py-4 border-b border-gray-200 bg-white">
              <LogoutButton />
            </header>
>>>>>>> Stashed changes
            <div className="flex-1 p-8">
              {children}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ClientAuthGuard>
  );
}
