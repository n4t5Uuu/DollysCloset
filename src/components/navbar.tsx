import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
    return (
        <header className="w-full h-[80px] bg-[#fcfcfc] fixed top-0 z-50 shadow-md">
            <nav className="relative w-full h-full flex items-center px-20">
                
                <div className="flex items-center gap-5">
                    <Image src="/assets/no-bg-logo.png" alt="Dolly's Closet Logo" width={60} height={60} />
                    <h2 className="text-[#E7A3B0] font-bold text-2xl">Dolly's Closet</h2>
                </div>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-10">
                    {/**Iterates the list for the navigation items*/}
                    {["Collection", "About", "Contact"].map((item) => (
                        <Link 
                            // checks if the item is Collection and will redirect to the root page 
                            // since the root page is the collection page
                            href={item === "Collection" ? "/" : `/${item.toLowerCase()}`} 
                            key={item}
                            className="group relative"
                        >
                            <div>
                                <p className="text-black font-semibold text-lg group-hover:text-[#E7A3B0] transition-all 
                                        duration-300 font-montserrat">
                                    {item}
                                </p>

                                <span 
                                    className="absolute left-0 -bottom-0.5 h-1 w-0 bg-[#E7A3B0] transition-all 
                                        duration-300 group-hover:w-full"
                                >
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </nav>
        </header>
    )
}