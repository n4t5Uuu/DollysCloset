import SettingsClient from "./SettingsClient";
import { getServerAuthState } from "@/lib/auth/auth-server";
import { redirect } from "next/navigation";
import { buildLoginPath, buildUnauthorizedPath } from "@/lib/auth/auth-routing";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
    const authState = await getServerAuthState();
    const roleLabel = authState.ok && authState.role === 'admin' ? "Admin Panel" : "Employee Panel";
    return {
        title: `Settings | ${roleLabel}`,
    };
}

export default async function SettingsPage() {
    const authState = await getServerAuthState();
    
    if (!authState.ok) redirect(buildLoginPath({ reason: authState.reason }));
    if (authState.role !== 'admin' && authState.role !== 'employee') {
        redirect(buildUnauthorizedPath("access-denied"));
    }

    return <SettingsClient />;
}
