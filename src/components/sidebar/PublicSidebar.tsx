"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import noBgLogo from "@/assets/images/logo/no-bg-logo.png";

import {
  Home,
  LayoutGrid,
  Info,
  Mail,
  LayoutDashboard
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

export default function PublicSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/collection", label: "Collection", icon: LayoutGrid },
    { href: "/about", label: "About", icon: Info },
    { href: "/contact", label: "Contact", icon: Mail },
  ];

  return (
    <Sidebar 
      side="left"
      variant="floating"
      className="z-50 md:hidden border-none bg-white shadow-xl" 
      collapsible="offcanvas"
    >
      <SidebarHeader className="px-6 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <Image 
            src={noBgLogo} 
            alt="Dolly's Closet Logo" 
            width={40} 
            height={40} 
          />
          <div className="flex flex-col">
            <span className="font-oswald font-bold text-lg tracking-wider text-[#E7A3B0] uppercase">Dolly&apos;s Closet</span>
            <span className="text-[10px] text-gray-500 font-montserrat uppercase tracking-[0.2em] -mt-1">Elegance Redefined</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4 pb-4 pt-4">
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
                          ? "bg-[#E7A3B0] text-white shadow-md scale-[1.02] font-bold"
                          : "text-gray-600 hover:bg-[#fff5f7] hover:text-[#E7A3B0] hover:translate-x-1"
                      }`}
                    >
                      <Link 
                        href={item.href} 
                        className="flex items-center gap-3 w-full"
                        onClick={() => setOpenMobile(false)}
                      >
                        <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-400 group-hover:text-[#E7A3B0]"}`} />
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
