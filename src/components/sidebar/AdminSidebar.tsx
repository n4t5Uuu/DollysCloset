"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { 
  Home,
  BarChart3,
  Users,
  Activity,
  Package,
  FileText
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export default function AdminSidebar() {
  const pathname = usePathname();


  const navItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/employees", label: "Manage Employees", icon: Users },
    { href: "/admin/activity-logs", label: "Activity Logs", icon: Activity },
    { href: "/admin/inventory", label: "Manage Inventory", icon: Package },
    { href: "/admin/manage-details", label: "Manage Details", icon: FileText },
  ];



  return (
    <Sidebar className="bg-white border-r border-gray-200" collapsible="icon">
      <SidebarHeader className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold">Admin Panel</h1>
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
                      className={`h-auto px-4 py-3 rounded-xl transition-all duration-300 ease-out group/item ${
                        isActive
                          ? "bg-black text-[#E7A3B0] shadow-xl shadow-[#E7A3B0]/20 [&_svg]:text-[#E7A3B0] scale-[1.02] font-semibold hover:bg-black/90"
                          : "text-zinc-500 hover:bg-[#E7A3B0]/10 hover:text-[#E7A3B0] hover:translate-x-1 hover:shadow-sm [&_svg]:transition-colors"
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


    </Sidebar>
  );
}