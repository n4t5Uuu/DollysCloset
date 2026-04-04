import { Suspense } from "react";
import { CollectionsView } from "@dollys-closet/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Collection",
    description: "Explore the full Dolly's Closet collection. Premium boutique inventory organized by category, brand, and rental style.",
}

export default function CollectionPage() {
    return (
        <Suspense>
            <CollectionsView />
        </Suspense>
    );
}
