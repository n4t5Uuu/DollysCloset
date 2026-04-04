"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Collection", href: "/collection" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function StoreNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 h-20 w-full bg-white shadow-md">
      <nav className="relative flex h-full w-full items-center px-6 md:px-8 lg:px-12 xl:px-20">
        <Link
          href="/"
          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 md:static md:translate-x-0 md:flex-1"
        >
          <span className="text-xl text-[#E7A3B0] md:text-2xl">Dolly&apos;s Closet</span>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-8 md:flex">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-montserrat text-base font-semibold text-black transition-colors hover:text-[#E7A3B0]"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-1 items-center justify-end md:hidden">
          <button
            type="button"
            className="text-gray-700 transition-colors hover:text-[#E7A3B0]"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </nav>

      {isMenuOpen && (
        <div className="border-b bg-white px-6 py-4 shadow-lg md:hidden">
          <div className="flex flex-col items-center gap-4">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-montserrat text-lg font-semibold text-gray-800 transition-colors hover:text-[#E7A3B0]"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
