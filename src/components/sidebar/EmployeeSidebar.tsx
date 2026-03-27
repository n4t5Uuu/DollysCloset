"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Home,
  Package,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import LogoutButton from "@/components/general-components/LogoutButton";

export default function EmployeeSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();


  const navItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/dashboard/inventory", label: "Manage Inventory", icon: Package },
  ];



  return (
    <Sidebar 
      variant="floating"
      className="md:pt-[80px] z-30 transition-all duration-500 border-none bg-[#F7F2F2]/95 backdrop-blur-xl shadow-[8px_0_30px_-5px_rgba(231,163,176,0.15)] **:data-[sidebar=sidebar]:border-none" 
      collapsible="icon"
    >
      <SidebarContent className="px-4 pb-4 pt-8">
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
                      className={`h-auto px-4 py-3.5 rounded-2xl transition-all duration-300 ease-out group/item ${
                        isActive
                          ? "bg-black text-white shadow-[0_12px_30px_-5px_rgba(231,163,176,0.35)] [&_svg]:text-[#E7A3B0] scale-[1.04] font-bold hover:bg-black/90"
                          : "text-zinc-600 hover:bg-white hover:text-[#E7A3B0] hover:translate-x-1 hover:shadow-[0_4px_12px_-4px_rgba(231,163,176,0.2)] [&_svg]:transition-colors"
                      }`}
                    >
                      <Link 
                        href={item.href} 
                        className="flex items-center gap-3"
                        onClick={() => setOpenMobile(false)}
                      >
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

      <SidebarFooter className="px-4 pb-6">
        <LogoutButton variant="sidebar" />
      </SidebarFooter>
    </Sidebar>
  );
}