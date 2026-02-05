"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/footer";

export default function ConditionalFooter() {
    const pathname = usePathname();

    // Array of path prefixes where the footer should be hidden
    const hiddenPaths = ["/admin", "/employee"];

    const shouldHideFooter = hiddenPaths.some((path) => pathname.startsWith(path));

    if (shouldHideFooter) {
        return null;
    }

    return <Footer />;
}
