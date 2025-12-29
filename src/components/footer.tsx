import Image from "next/image";
import Link from "next/link";

// change the import of icons since its deprecated
import {Facebook, Instagram} from "lucide-react";

export default function Footer() {

    const headerStyle = "uppercase text-[#E7A3B0] font-bold text-xl";
    const headerContentSpace = "space-y-2 text-lg";
    const contentStyle = "text-white "

    return (
        <footer className="w-full bg-[#262626] h-[240px] mt-[200px] flex items-center justify-center">
            <div className="grid grid-cols-4 gap-10">
                <div>
                    <Image 
                        src="/assets/logo.jpg" 
                        alt="Dolly's Closet Logo" 
                        width={180}
                        height={180}
                        className="rounded-xl object-cover w-[180px] h-[180px]"
                    />
                </div>

                <div className={headerContentSpace}>
                    <h2 className={headerStyle}>Shop</h2>
                    <Link href="/" className={contentStyle}>Browse Products</Link>
                </div>

                <div className={headerContentSpace}>
                    <h2 className={headerStyle}>Support</h2>
                    <div className="flex flex-col space-y-2">
                        <Link href="/contact" className={contentStyle}>Contact Us</Link>
                        <Link href="/about" className={contentStyle}>FAQ</Link>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className={headerContentSpace}>
                        <h2 className={headerStyle}>Social Media</h2>
                        <div className="flex items-center gap-5">
                            <Facebook />
                            <Instagram />
                        </div>
                    </div>

                    <div className={headerContentSpace}>
                        <h2 className={headerStyle}>Address</h2>
                        <p className={contentStyle}>04 Admiral, Talon Tres, Las Pinas City</p>
                    </div>
                </div>
            </div>
        </footer>
    )
}