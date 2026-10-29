"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { LucideIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
  LogoutButton,
} from "@dollys-closet/ui";

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export default function RoleSidebar({ title, navItems }: { title: string; navItems: SidebarNavItem[] }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();




  return (
    <Sidebar
      variant="floating"
      className="z-30 transition duration-500 border-none bg-zinc-50/95 backdrop-blur-xl shadow-[8px_0_30px_-5px_rgba(231,163,176,0.1)] **:data-[sidebar=sidebar]:border-none"
      collapsible="icon"
    >
      <SidebarHeader className="px-6 pt-6 md:pt-[104px] pb-4">
        <div className="flex flex-col">
          <span className="font-oswald font-bold text-lg tracking-wider text-[#1A1A1A] uppercase">{title}</span>
          <span className="text-[10px] text-[#828282] font-montserrat uppercase tracking-[0.2em] -mt-1">Dolly&apos;s Closet</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4 pb-4 pt-2">
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
                      className={`h-auto px-4 py-3.5 rounded-2xl transition duration-300 ease-out group/item ${
                        isActive
                          ? "bg-white text-zinc-900 shadow-[0_8px_25px_-5px_rgba(231,163,176,0.2)] [&_svg]:text-[#E7A3B0] scale-[1.02] font-bold hover:bg-white"
                          : "text-zinc-500 hover:bg-white/80 hover:text-[#E7A3B0] hover:translate-x-1 hover:shadow-[0_4px_12px_-4px_rgba(231,163,176,0.15)] [&_svg]:transition-colors"
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
