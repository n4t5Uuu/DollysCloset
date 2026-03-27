import ManageDetailsClient from "./ManageDetailsClient";
import { getServerAuthState } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { buildLoginPath, buildUnauthorizedPath } from "@/lib/auth-routing";

export default async function ManageDetailsPage() {
    const authState = await getServerAuthState();
    
    if (!authState.ok) redirect(buildLoginPath({ reason: authState.reason }));
    if (authState.role !== 'admin') redirect(buildUnauthorizedPath("access-denied"));

    return <ManageDetailsClient />;
}
