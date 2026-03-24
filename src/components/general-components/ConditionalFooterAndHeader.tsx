"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/general-components/footer";
import Navbar from "@/components/general-components/navbar";

export function ConditionalNavbar() {
    const pathname = usePathname();
    const hiddenNavbarPaths = ["/", "/unauthorized", "/login", "/forgot-password", "/reset-password"];

    const shouldHideNavbar = hiddenNavbarPaths.includes(pathname);

    if (shouldHideNavbar) {
        return null;
    }

    return <Navbar />;
}

export function ConditionalFooter() {
    const pathname = usePathname();

    // Array of path prefixes where the footer should be hidden
    const hiddenFooterPrefixes = ["/dashboard", "/admin", "/employee"];
    
    // Check if path starts with any of the hidden prefixes OR if it is exactly the root path (login), unauthorized, forgot-password, or reset-password page
    const shouldHideFooter = hiddenFooterPrefixes.some((path) => pathname.startsWith(path)) || 
                             ["/", "/unauthorized", "/login", "/forgot-password", "/reset-password"].includes(pathname);

    if (shouldHideFooter) {
        return null;
    }

    return <Footer />;
}
