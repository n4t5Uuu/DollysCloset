import { 
    Card,
    CardFooter,
    CardTitle
} from "@/components/ui/card"

import Image from "next/image"
import { Product } from "@/types/product.types"
import { resolveProductPlaceholder } from "@/lib/product-placeholder"

interface ProductCardProps {
    product?: Product;
    onClick?: () => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
    if (!product) {
        return (
            <Card className="border-none shadow-none rounded-none bg-transparent group cursor-pointer w-full max-w-[280px] flex flex-col gap-4">
                <div className="bg-[#f5f5f5] aspect-3/4 w-full flex items-center justify-center flex-col relative overflow-hidden rounded-xl">
                    <div className="font-oswald font-bold text-xl tracking-widest text-black/90">
                        NO PRODUCT
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card 
            className="border-none shadow-none rounded-none bg-transparent group cursor-pointer w-full flex flex-col gap-4 transition-all duration-300"
            onClick={onClick}
        >
            {/**Image Area */}
            <div className="bg-[#f5f5f5] aspect-3/4 w-full flex items-center justify-center flex-col relative overflow-hidden rounded-xl group-hover:shadow-lg transition-shadow duration-300">
                <Image
                    src={product.images[0] || resolveProductPlaceholder(product.category)}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                
                {/* Optional: Add to wishlist or quick view overlay could go here */}
                {/* <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button className="bg-white/80 p-2 rounded-full hover:bg-white text-black transition-colors">
                        <Heart className="w-4 h-4" />
                    </button>
                </div> */}
            </div>

            <CardFooter className="p-0 bg-transparent w-full flex flex-col items-start gap-1">
                <div className="w-full flex justify-between items-start gap-2">
                    <CardTitle className="font-playfair-display font-medium text-lg leading-tight text-[#121212] line-clamp-2 w-full">
                        {product.name}
                    </CardTitle>
                    <div className="text-xs font-oswald font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap">
                        {product.size || "N/A"}
                    </div>
                </div>
                
                <div className="w-full flex items-center justify-between mt-1">
                    <div className="font-oswald text-lg font-medium tracking-wide text-[#E7A3B0]">
                        ₱{product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs font-oswald font-semibold uppercase tracking-wider text-gray-600 whitespace-nowrap">
                        {product.condition || "N/A"}
                    </div>
                </div>
            </CardFooter>
        </Card>
    )
}