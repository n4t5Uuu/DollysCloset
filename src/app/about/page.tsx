import Image from 'next/image';
import Link from 'next/link';
import { images } from '@/data/outfit-images';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/data/faq";
import noBgLogo from "@/assets/images/logo/no-bg-logo.png";

export default function About() {
    return (
        <main className="w-full bg-white text-black">
            {/* Hero Section */}
            <section className="relative w-full h-[85vh] flex overflow-hidden">
                {/* Image Strips */}
                {images.map((img, index) => (
                    <div key={index} className="relative flex-1 h-full border-r border-white/10 last:border-r-0">
                        <Image
                            src={img.imagePath}
                            alt={img.alt}
                            fill
                            className="object-cover transition-transform duration-700 hover:scale-105"
                            placeholder="blur"
                        />
                        {/* Dark Overlay for better text readability */}
                        <div className="absolute inset-0 bg-black/40" />
                    </div>
                ))}

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-4">
                    <h1 className="!font-great-vibes text-7xl md:text-9xl text-[#FF9EAA] drop-shadow-lg animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        Elegance Redefined
                    </h1>
                    <p className="mt-6 text-white text-lg md:text-xl font-light tracking-wider max-w-3xl drop-shadow-md animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
                        Discover timeless pieces, collect your favorites, and elevate your wardrobe with curated style made to stand out.
                    </p>
                    <Link 
                        href="/collection" 
                        className="mt-10 px-10 py-4 bg-white/20 backdrop-blur-md border border-white/50 text-white rounded-md uppercase tracking-widest hover:bg-white/40 transition-all duration-300 shadow-lg animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both"
                    >
                        Explore the Catalog
                    </Link>
                </div>
            </section>

            {/* About Dolly's Closet Section */}
            <section className="w-full py-20 px-6 md:px-20 flex flex-col md:flex-row items-center justify-between gap-12 bg-white">
                <div className="w-full md:w-1/2 space-y-6">
                    <h2 className="text-4xl md:text-5xl font-oswald uppercase tracking-tight">
                        About Dolly's Closet
                    </h2>
                    <div className="space-y-4 text-gray-600 leading-relaxed font-light text-justify">
                        <p>
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus feugiat, nisi sed posuere laoreet, lacus risus pretium nunc, vitae luctus sapien tortor nec justo. Aenean vitae velit nec lorem laoreet tempor. Curabitur sed nibh in enim pretium viverra. Fusce nec ex vel arcu vulputate dignissim. Suspendisse potenti. Nulla facilisi.
                        </p>
                        <p>
                            Vivamus tristique justo in nibh fermentum, id pulvinar elit feugiat. Integer facilisis mauris ut neque tincidunt, nec interdum magna ultricies. Etiam vel diam vel risus cursus accumsan. Mauris ut massa ac elit iaculis tristique vitae vitae odio.
                        </p>
                    </div>
                </div>
                <div className="w-full md:w-1/3 flex justify-center md:justify-end">
                    <div className="relative w-64 h-64 md:w-96 md:h-96">
                        <Image 
                            src={noBgLogo} 
                            alt="Dolly's Closet Logo" 
                            fill 
                            className="object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500"
                        />
                    </div>
                </div>
            </section>

            {/* History Section */}
            <section className="w-full py-20 px-6 md:px-20 flex flex-col md:flex-row items-center justify-between gap-12 bg-[#1a1a1a] text-white">
                <div className="w-full md:w-1/2 flex justify-center md:justify-start order-2 md:order-1">
                    <div className="relative w-full max-w-md aspect-square bg-gray-200 overflow-hidden shadow-2xl">
                        {/* Placeholder Image using one of the outfit images */}
                        <Image 
                            src={images[3].imagePath} 
                            alt="History Image" 
                            fill 
                            className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                            <span className="text-4xl font-oswald text-white/80 uppercase tracking-widest drop-shadow-md">IMAGE</span>
                        </div>
                    </div>
                </div>
                <div className="w-full md:w-1/2 space-y-6 text-right order-1 md:order-2">
                    <h2 className="text-4xl md:text-5xl font-oswald uppercase tracking-tight text-[#FF9EAA]">
                        History
                    </h2>
                    <div className="space-y-4 text-gray-300 leading-relaxed font-light ml-auto max-w-xl">
                        <p>
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus feugiat, nisi sed posuere laoreet, lacus risus pretium nunc, vitae luctus sapien tortor nec justo. Aenean vitae velit nec lorem laoreet tempor. Curabitur sed nibh in enim pretium viverra. Fusce nec ex vel arcu vulputate dignissim. Suspendisse potenti. Nulla facilisi.
                        </p>
                        <p>
                            Vivamus tristique justo in nibh fermentum, id pulvinar elit feugiat. Integer facilisis mauris ut neque tincidunt, nec interdum magna ultricies. Etiam vel diam vel risus cursus accumsan. Mauris ut massa ac elit iaculis tristique vitae vitae odio.
                        </p>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="w-full py-20 px-6 md:px-20 bg-white shadow-inner">
                <div className="w-full mx-auto space-y-6">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 mx-auto relative mb-0">
                            {/* Small circular logo icon */}
                            <Image 
                                src={noBgLogo}
                                alt="Dolly's Closet Logo"
                                fill
                                className="object-contain p-1 rounded-full border-2 border-gray-200 shadow-md"
                            />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-oswald uppercase tracking-tight text-black">
                            Frequently Asked Questions
                        </h2>
                        <p className="text-gray-500 max-w-lg mx-auto">
                            Everything you need to know about our products and services.
                        </p>
                    </div>

                    <div className="bg-gray-50/50 p-6 md:p-10 rounded-2xl border border-gray-100 shadow-sm">
                        <Accordion type="single" collapsible className="w-full space-y-4">
                            {faqs.map((faq) => (
                                <AccordionItem key={faq.id} value={faq.id} className="border border-gray-200 px-4 rounded-lg bg-white data-[state=open]:border-[#FF9EAA] \
                                    data-[state=open]:ring-1 data-[state=open]:ring-[#FF9EAA]/20 transition-all duration-300 cursor-pointer">
                                    <AccordionTrigger className="text-left text-lg font-medium hover:text-[#FF9EAA] transition-colors py-4 cursor-pointer">
                                        {faq.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-gray-600 pb-4 leading-relaxed">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </div>
            </section>
        </main>
    );
}