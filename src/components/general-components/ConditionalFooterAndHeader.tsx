"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/general-components/footer";
import Navbar from "@/components/general-components/navbar";

export function ConditionalNavbar() {
    const pathname = usePathname();
    const hiddenNavbarPaths = ["/", "/unauthorized", "/login"];

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
    
    // Check if path starts with any of the hidden prefixes OR if it is exactly the root path (login) or unauthorized page
    const shouldHideFooter = hiddenFooterPrefixes.some((path) => pathname.startsWith(path)) || pathname === "/" || pathname === "/unauthorized" || pathname === "/login";

    if (shouldHideFooter) {
        return null;
    }

    return <Footer />;
}
