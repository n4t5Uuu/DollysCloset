import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboards/Dashboard";
import { getServerAuthState } from "@/lib/auth/auth-server";
import { buildLoginPath, buildUnauthorizedPath } from "@/lib/auth/auth-routing";

export async function generateMetadata(): Promise<Metadata> {
    const authState = await getServerAuthState();
    const roleLabel = authState.ok && authState.role === 'admin' ? "Admin Panel" : "Employee Panel";
    return {
        title: `Overview | ${roleLabel}`,
    };
}


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

    if (authState.role === 'admin' || authState.role === 'employee') {
        return <Dashboard role={authState.role} />;
    }
    redirect(buildUnauthorizedPath("access-denied"));
}
