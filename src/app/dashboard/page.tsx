import { authHelper } from "@/lib/auth-helper";
import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import EmployeeDashboard from "@/components/dashboards/EmployeeDashboard";
import { dataHelper } from "@/lib/data-helper";

export default async function DashboardPage() {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: userData } = await authHelper.getUserRole(user.id, supabase);
    
    if (userData?.role === 'admin') {
        return <AdminDashboard />;
    } else if (userData?.role === 'employee') {
        return <EmployeeDashboard />;
    }
    return <div>Access Denied</div>;
}
