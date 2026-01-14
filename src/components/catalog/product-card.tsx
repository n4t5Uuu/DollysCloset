import { 
    Card,
    CardFooter,
    CardTitle
} from "@/components/ui/card"

import Image from "next/image"

interface ProductCardProps {
    productName: string
    price: number
    image: string // assuming na string siya
}

export default function ProductCard() {
    return (
        <Card className="border-none shadow-none rounded-sm bg-transparent group cursor-pointer w-full max-w-[280px] flex flex-col">
            {/**Image Area */}
            <div className="bg-[#E5E5E5] aspect-3/4  w-full flex items-center justify-center flex-col relative overflow-hidden">
                <div className="font-oswald font-bold text-xl tracking-widest text-black/90 group-hover:scale-110 transition-transform
                        duration-500 z-10">
                    PRODUCT IMAGE
                </div>
                {/**CODE FOR IMAGE
                 * 
                 * <Image
                    src="/placeholder.png"
                    alt="Product Image"
                    fill
                    className="object-contain"
                />
                 */}

                <CardFooter className="bg-[#e7a3b0ed] h-20 w-full flex flex-col justify-center items-start px-4 absolute bottom-0 text-[#121212] font-medium">
                    <CardTitle className="font-bold text-xl tracking-widest text-black/90 mb-1">
                        PRODUCT NAME
                    </CardTitle>
                    PRICE
                </CardFooter>
                
            </div>
        </Card>
    )
}