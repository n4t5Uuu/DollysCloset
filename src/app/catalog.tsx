import Image from "next/image";

import FeatureCardCarousel from "@/components/catalog/feature-card-carousel";
import SearchBar from "@/components/search-bar";
import CatalogSidebar from "@/components/catalog/catalog-sidebar";
import ProductCard from "@/components/catalog/product-card";

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
            <div className="w-full space-y-8">
                <div className="flex justify-between items-center bg-[#E7A3B0] h-[60px] w-full px-8">
                    <h2 className="!font-playfair-display font-bold text-2xl text-[#121212]">
                        Our Collections
                    </h2>
                    <SearchBar />
                </div>

                <div className="w-full px-8 grid grid-cols-5">
                    <div className="col-span-1">
                        <CatalogSidebar />
                    </div>
                    <div className="col-span-4">
                        <div className="mb-2 text-sm text-gray-500 font-montserrat">
                            12 Items Found
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-10">
                            {Array.from({ length: 18 }).map((_, index) => (
                                <ProductCard key={index} />
                            ))}
                        </div>

                        <div className="mt-16 flex justify-center">
                            <button className="px-8 py-3 bg-[#E7A3B0] text-white font-medium rounded-lg font-oswald text-sm 
                                tracking-widest hover:bg-[#ca8c98] transition-colors uppercase">
                                Load More
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}