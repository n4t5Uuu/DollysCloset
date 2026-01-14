// components/admin/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase/browser";
import { 
  Home,
  BarChart3,
  Users,
  Activity,
  Package,
  LogOut 
} from "lucide-react";

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: "/admin/dashboard", label: "Home", icon: Home },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/employees", label: "Manage Employees", icon: Users },
    { href: "/admin/activity-logs", label: "Activity Logs", icon: Activity },
    { href: "/admin/inventory", label: "Manage Inventory", icon: Package },
  ];

  async function handleLogout() {
    await browserSupabase.auth.signOut();
    router.push("/staff-login");
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold">Admin Panel</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-black text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}