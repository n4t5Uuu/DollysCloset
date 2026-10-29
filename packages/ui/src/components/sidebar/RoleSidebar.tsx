"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
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
    useSidebar,
} from "../ui/sidebar";
import LogoutButton from "../general-components/LogoutButton";

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
            className="z-30 border-none bg-zinc-50/95 shadow-[8px_0_30px_-5px_rgba(231,163,176,0.1)] transition-all duration-500 backdrop-blur-xl **:data-[sidebar=sidebar]:border-none"
            collapsible="icon"
        >
            <SidebarHeader className="px-6 pb-4 pt-6 md:pt-[104px]">
                <div className="flex flex-col">
                    <span className="font-oswald text-lg font-bold uppercase tracking-wider text-[#1A1A1A]">{title}</span>
                    <span className="-mt-1 font-montserrat text-[10px] uppercase tracking-[0.2em] text-[#828282]">Dolly&apos;s Closet</span>
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
                                            className={`h-auto rounded-2xl px-4 py-3.5 transition-all duration-300 ease-out group/item ${
                                                isActive
                                                    ? "scale-[1.02] bg-white font-bold text-zinc-900 shadow-[0_8px_25px_-5px_rgba(231,163,176,0.2)] hover:bg-white [&_svg]:text-[#E7A3B0]"
                                                    : "text-zinc-500 hover:translate-x-1 hover:bg-white/80 hover:text-[#E7A3B0] hover:shadow-[0_4px_12px_-4px_rgba(231,163,176,0.15)] [&_svg]:transition-colors"
                                            }`}
                                        >
                                            <Link
                                                href={item.href}
                                                className="flex items-center gap-3"
                                                onClick={() => setOpenMobile(false)}
                                            >
                                                <item.icon className="h-5 w-5" />
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
