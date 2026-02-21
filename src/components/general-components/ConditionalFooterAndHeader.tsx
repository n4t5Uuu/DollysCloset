"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/general-components/Footer";
import Navbar from "@/components/general-components/NavBar";

export function ConditionalNavbar() {
    const pathname = usePathname();
    const hiddenNavbarPaths = ["/"];

    const shouldHideNavbar = hiddenNavbarPaths.includes(pathname);

    if (shouldHideNavbar) {
        return null;
    }

    return <Navbar />;
}

export function ConditionalFooter() {
    const pathname = usePathname();

    // Array of path prefixes where the footer should be hidden
    // Array of path prefixes where the footer should be hidden.
    // Dashboard, admin, and employee routes are hidden via startsWith.
    // The login page (root '/') is hidden via exact match.
    const hiddenFooterPrefixes = ["/dashboard", "/admin", "/employee"];
    
    // Check if path starts with any of the hidden prefixes OR if it is exactly the root path (login)
    const shouldHideFooter = hiddenFooterPrefixes.some((path) => pathname.startsWith(path)) || pathname === "/";

    if (shouldHideFooter) {
        return null;
    }

    return <Footer />;
}
