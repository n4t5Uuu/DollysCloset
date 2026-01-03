import Image from "next/image";
import FeatureCardCarousel from "@/components/catalog/feature-card-carousel";
import SearchBar from "@/components/search-bar";

export const metadata = {
    title: "Dolly's Closet - Catalog",
    description: "Dolly's Closet - Catalog",
}

export default function CatalogPage() {
    return (
        <main className="space-y-12 w-full flex flex-col items-center">

            {/* For the Announcements */}
            <div className="w-full h-[60px] bg-[#E7A3B0] flex items-center justify-center">
                <h2 className="!font-playfair-display font-bold text-2xl text-[#121212]">
                    ANNOUNCEMENTS HERE
                </h2>
            </div>

            {/* For the Featured Collection Carousel*/}
            <div className="w-full flex items-center justify-center flex-col">
                <h3 className="text-[#121212] !font-playfair-display font-bold text-2xl mb-8">
                    Featured Collection
                </h3>
                <FeatureCardCarousel />
            </div>

            {/* For the Collections */}
            <div className="w-full">
                <div className="flex justify-between items-center bg-[#E7A3B0] h-[60px] px-8 w-full">
                    <h2 className="!font-playfair-display font-bold text-2xl text-[#121212]">
                        Our Collections
                    </h2>
                    <SearchBar />
                </div>


            </div>
        </main>
    )
}