import { redirect } from "next/navigation";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import EmployeeDashboard from "@/components/dashboards/EmployeeDashboard";
import { getServerAuthState } from "@/lib/auth/auth-server";
import { buildLoginPath, buildUnauthorizedPath } from "@/lib/auth/auth-routing";

/**
 * DashboardPage (Server Component)
 * 
 * Serves as the primary entry point for authenticated users.
 * Performs a server-side authentication check and dynamically renders the appropriate 
 * dashboard experience (Admin vs. Employee) based on the user's role.
 * 
 * Redirects to the login page if the session is invalid or unauthorized.
 */
export default async function DashboardPage() {
    const authState = await getServerAuthState();
    
    if (!authState.ok) redirect(buildLoginPath({ reason: authState.reason }));

    if (authState.role === 'admin') {
        return <AdminDashboard />;
    } else if (authState.role === 'employee') {
        return <EmployeeDashboard />;
    }
    redirect(buildUnauthorizedPath("access-denied"));
}
