"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/general-components/footer";
import Navbar from "@/components/general-components/navbar";

export function ConditionalNavbar() {
    const pathname = usePathname();
    const hiddenNavbarPaths = ["/unauthorized", "/login", "/forgot-password", "/reset-password"];
    const hiddenNavbarPrefixes = ["/admin", "/employee"];

    const isHiddenByPath = hiddenNavbarPaths.includes(pathname) || 
                          hiddenNavbarPrefixes.some(prefix => pathname.startsWith(prefix));

    if (isHiddenByPath) {
        return null;
    }

    return <Navbar />;
}

export function ConditionalFooter() {
    const pathname = usePathname();

    // Array of path prefixes where the footer should be hidden
    const hiddenFooterPrefixes = ["/dashboard", "/admin", "/employee"];
    const hiddenFooterPaths = ["/", "/unauthorized", "/login", "/forgot-password", "/reset-password"];
    
    // Check if path starts with any of the hidden prefixes OR if it is in the hidden paths list
    const shouldHideFooter = hiddenFooterPrefixes.some((path) => pathname.startsWith(path)) || 
                             hiddenFooterPaths.includes(pathname);

    if (shouldHideFooter) {
        return null;
    }

    return <Footer />;
}
