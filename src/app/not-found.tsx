import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#fcfcfc] font-montserrat px-4">
      {/* 
        This style block forces the global navbar (header) and footer to hide 
        whenever the 404 Not Found page is active.
      */}
      <style>{`
        header, footer {
          display: none !important;
        }
      `}</style>
      
      <div className="text-center max-w-lg flex flex-col items-center gap-6 animate-in zoom-in-95 duration-700">
        <Image 
          src="/assets/no-bg-logo.png" 
          alt="Dolly's Closet Logo" 
          width={120} 
          height={120} 
          className="opacity-90"
        />
        
        <h1 className="text-8xl font-playfair font-bold text-[#E7A3B0] tracking-tighter">
          404
        </h1>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-great-vibes text-black font-medium">
            Lost in the closet
          </h2>
          <p className="text-gray-500 font-medium">
            Oops! The page you are looking for doesn't exist or has been moved.
          </p>
        </div>

        <Link 
          href="/" 
          className="mt-4 px-8 py-3.5 bg-[#E7A3B0] hover:bg-[#d68c9d] text-white font-semibold rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 active:scale-95 text-sm uppercase tracking-wider"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
