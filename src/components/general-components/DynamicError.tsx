"use client";

import Link from "next/link";
import Image from "next/image";
import noBgLogo from "@/assets/images/logo/no-bg-logo.png";
import { AlertCircle, Lock, ShieldAlert, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";

interface DynamicErrorProps {
  code: string | number;
  title: string;
  message: string;
  showHomeButton?: boolean;
  onRetry?: () => void;
}

export default function DynamicError({
  code,
  title,
  message,
  showHomeButton = true,
  onRetry
}: DynamicErrorProps) {
  
  const getIcon = () => {
    switch (code.toString()) {
      case "404":
        return <FileSearch className="w-12 h-12 text-[#E7A3B0]" />;
      case "401":
      case "403":
        return <Lock className="w-12 h-12 text-red-500" />;
      case "unauthorized":
        return <ShieldAlert className="w-12 h-12 text-amber-500" />;
      default:
        return <AlertCircle className="w-12 h-12 text-red-600" />;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FFFBFB] font-montserrat px-4 relative overflow-hidden">
      
      {/* Soft aesthetic background layers */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-40" 
        style={{ 
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(255, 226, 232, 0.4) 0%, transparent 70%),
            linear-gradient(to right, rgba(231, 163, 176, 0.03) 1px, transparent 1px), 
            linear-gradient(to bottom, rgba(231, 163, 176, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 60px 60px, 60px 60px',
        }}
      />
      
      <div className="relative z-10 text-center max-w-lg flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Top Logo Branding */}
        <div className="mb-4">
          <Image 
            src={noBgLogo} 
            alt="Dolly's Closet Logo" 
            width={120} 
            height={120} 
            className="opacity-90 drop-shadow-sm"
          />
        </div>

        {/* Dynamic Header & Message */}
        <div className="space-y-4">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80">
              {getIcon()}
            </div>
          </div>
          
          <h1 className={cn(
            "text-7xl font-playfair font-bold text-[#E7A3B0] tracking-tighter",
            code.toString().length > 3 ? "text-5xl" : "text-7xl"
          )}>
            {code}
          </h1>
          
          <div className="space-y-2 px-6">
            <h2 className="text-3xl font-great-vibes text-gray-900 font-medium">
              {title}
            </h2>
            <p className="text-gray-500 font-medium leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Actions Section */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full justify-center px-8">
          {onRetry && (
            <button 
              onClick={onRetry}
              className="px-8 py-3.5 bg-zinc-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:scale-95 text-xs uppercase tracking-widest"
            >
              Try Again
            </button>
          )}

          {showHomeButton && (
            <Link 
              href="/" 
              className="px-8 py-3.5 bg-linear-to-r from-[#E7A3B0] to-[#e2899a] hover:from-[#e2899a] hover:to-[#DE7588] text-white font-bold rounded-xl shadow-[0_8px_20px_-6px_rgba(231,163,176,0.6)] hover:shadow-[0_12px_24px_-6px_rgba(231,163,176,0.8)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 text-xs uppercase tracking-widest text-center"
            >
              Return Home
            </Link>
          )}
        </div>

        {/* Footer text for support - subtle */}
        <p className="text-xs text-gray-400 mt-12 font-medium">
          If you think this is a mistake, please contact our support team.
        </p>
      </div>
    </div>
  );
}
