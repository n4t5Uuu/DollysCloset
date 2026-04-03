import InventoryManagement from "@/components/InventoryManagement";
import { getServerAuthState } from "@/lib/auth/auth-server";
import { redirect } from "next/navigation";
import { buildLoginPath, buildUnauthorizedPath } from "@/lib/auth/auth-routing";

/**
 * InventoryPage (Server Component)
 * 
 * Provides the primary interface for managing product inventory.
 * Supports both Admin and Employee views.
 * 
 * Features:
 * - Server-side authentication and role verification.
 * - Dynamic availability filtering based on URL `searchParams`.
 */
export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ availability?: string }> }) {
    const authState = await getServerAuthState();
    
    if (!authState.ok) redirect(buildLoginPath({ reason: authState.reason }));

    const params = await searchParams;
    const isAdmin = authState.role === 'admin';
    const isEmployee = authState.role === 'employee';

    if (!isAdmin && !isEmployee) {
        redirect(buildUnauthorizedPath("access-denied"));
    }

    return <InventoryManagement initialAvailabilityFilter={params.availability} />;
}
