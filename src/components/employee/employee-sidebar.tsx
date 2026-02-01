"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase/browser";
import { 
  Home,
  Package,
  LogOut 
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export default function EmployeeSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: "/employee/dashboard", label: "Home", icon: Home },
    { href: "/employee/inventory", label: "Manage Inventory", icon: Package },
  ];

  async function handleLogout() {
    await browserSupabase.auth.signOut();
    router.push("/staff-login");
  }

  return (
    <Sidebar className="bg-white border-r border-gray-200" collapsible="icon">
      <SidebarHeader className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold">Employee Portal</h1>
      </SidebarHeader>

      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`h-auto px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-black text-white hover:bg-black/90 hover:text-white"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-gray-200">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="w-full h-auto px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <div className="flex items-center gap-3 w-full">
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}