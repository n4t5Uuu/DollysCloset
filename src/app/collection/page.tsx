import Image from "next/image";
import CatalogPage from "@/app/catalog"

export const metadata = {
    title: "Dolly's Closet",
    description: "Dolly's Closet - Catalog",
}

export default function CollectionPage() {
    return (
        <CatalogPage />
    );
}
