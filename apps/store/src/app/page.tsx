import { Button } from "@dollys-closet/ui";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[70vh] flex flex-col items-center justify-center text-center px-6 bg-linear-to-b from-pink-50 to-white">
        <div className="space-y-6 max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h1 className="text-6xl md:text-8xl font-bold font-oswald text-gray-900 tracking-tight">
            DOLLY&apos;S CLOSET
          </h1>
          <p className="text-xl md:text-2xl font-montserrat text-gray-600 font-light tracking-wide">
            Curating Elegance. Redefining Boutique Fashion.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="bg-[#121212] text-white hover:bg-[#2b2b2b] rounded-full px-10 h-14 text-lg">
              <Link href="/collection">Shop Collection</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-gray-200 hover:bg-gray-50 rounded-full px-10 h-14 text-lg">
              <Link href="/about">Our Story</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Categories / Info */}
      <section className="py-20 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <Link href="/collection?filter=new" className="group relative aspect-3/4 overflow-hidden rounded-2xl bg-gray-100 shadow-md">
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20">
            <h3 className="font-oswald text-3xl uppercase tracking-widest">New Arrivals</h3>
            <span className="mt-2 text-sm font-montserrat uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity">Explore Now</span>
          </div>
        </Link>
        
        <Link href="/about" className="group relative aspect-3/4 overflow-hidden rounded-2xl bg-[#E7A3B0]/10 shadow-md">
           <div className="absolute inset-0 flex flex-col items-center justify-center text-[#121212] z-20 p-8 text-center">
            <h3 className="font-oswald text-3xl uppercase tracking-widest mb-4">Timeless Style</h3>
            <p className="font-montserrat text-sm leading-relaxed text-gray-600">Discover our philosophy behind every curated piece in our vintage collection.</p>
          </div>
        </Link>

        <Link href="/contact" className="group relative aspect-3/4 overflow-hidden rounded-2xl bg-gray-900 shadow-md">
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors z-10" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20">
            <h3 className="font-oswald text-3xl uppercase tracking-widest">Visit Us</h3>
            <span className="mt-2 text-sm font-montserrat uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity">Get Directions</span>
          </div>
        </Link>
      </section>

      <footer className="py-12 border-t border-gray-100 text-center text-gray-400 font-montserrat text-sm">
        <p>&copy; 2026 Dolly&apos;s Closet. All rights reserved.</p>
      </footer>
    </main>
  );
}
