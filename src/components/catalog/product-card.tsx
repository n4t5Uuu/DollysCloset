import { 
    Card,
    CardFooter,
    CardTitle
} from "@/components/ui/card"

import Image from "next/image"
import { Product } from "@/data/product-test-data"

interface ProductCardProps {
    product?: Product;
    onClick?: () => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
    if (!product) {
        return (
            <Card className="border-none shadow-none rounded-sm bg-transparent group cursor-pointer w-full max-w-[280px] flex flex-col">
                <div className="bg-[#E5E5E5] aspect-[3/4] w-full flex items-center justify-center flex-col relative overflow-hidden">
                    <div className="font-oswald font-bold text-xl tracking-widest text-black/90">
                        NO PRODUCT
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card 
            className="border-none shadow-none rounded-sm bg-transparent group cursor-pointer w-full max-w-[280px] flex flex-col"
            onClick={onClick}
        >
            {/**Image Area */}
            <div className="bg-[#E5E5E5] aspect-[3/4] w-full flex items-center justify-center flex-col relative overflow-hidden">
                <Image
                    src={product.images[0] || "/placeholder.png"}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                />

                <CardFooter className="bg-[#e7a3b0ed] h-20 w-full flex flex-col justify-center items-start px-4 absolute bottom-0 text-[#121212] font-medium">
                    <CardTitle className="font-bold text-lg tracking-wide text-black/90 mb-1 line-clamp-1">
                        {product.name}
                    </CardTitle>
                    <div className="font-oswald text-base">₱{product.price.toFixed(2)}</div>
                </CardFooter>
                
            </div>
        </Card>
    )
}