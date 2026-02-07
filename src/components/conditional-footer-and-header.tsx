"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";

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
    const hiddenFooterPaths = ["/", "/dashboard", "/admin", "/employee"];

    const shouldHideFooter = hiddenFooterPaths.some((path) => pathname.startsWith(path));

    if (shouldHideFooter) {
        return null;
    }

    return <Footer />;
}
