"use client";

import { Product } from "@/types/product.types";
import Image from "next/image";
import { useState } from "react";
import { X, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { resolveProductPlaceholder } from "@/lib/product-placeholder";

interface ProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const [selectedImage, setSelectedImage] = useState(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto relative border-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10 bg-white shadow-md text-black cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
          {/* Left Side - Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-3/4 bg-gray-200 rounded-lg overflow-hidden relative">
              <Image
                src={product.images[selectedImage] || resolveProductPlaceholder(product.category)}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>

            {/* Thumbnail Images */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square bg-gray-200 rounded-lg overflow-hidden relative border-2 transition-colors ${
                      selectedImage === index ? "border-[#E7A3B0]" : "border-transparent"
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 25vw, 12vw"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Details */}
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold font-playfair-display mb-2 text-black">{product.name}</h2>
              <p className="text-black text-sm">{product.category}</p>
            </div>

            <div className="text-3xl font-bold text-[#E7A3B0] font-oswald">
              ₱{product.price.toFixed(2)}
            </div>

            <div className="space-y-3 text-black">
              <div className="flex min-w-0 justify-between gap-4">
                <span className="font-semibold">Brand:</span>
                <span className="max-w-[60%] text-right break-words [overflow-wrap:anywhere]">{product.brand}</span>
              </div>
              <div className="flex min-w-0 justify-between gap-4">
                <span className="font-semibold">Size:</span>
                <span className="max-w-[60%] text-right break-words [overflow-wrap:anywhere]">{product.size}</span>
              </div>
              <div className="flex min-w-0 justify-between gap-4">
                <span className="font-semibold">Condition:</span>
                <span className="max-w-[60%] text-right break-words [overflow-wrap:anywhere]">{product.condition}</span>
              </div>
            </div>

            <p className="text-black leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {product.description}
            </p>

            {/* Stock Indicator */}
            <div className="inline-block">
              <div className="bg-[#E7A3B0] text-white px-4 py-2 rounded-md font-semibold">
                Stocks Available: {product.stock}
              </div>
            </div>

            {/* Visit Store Message */}
            <div className="pt-4 border-t border-gray-200">
              <a 
                href="https://www.google.com/maps/search/?api=1&query=04+Admiral,+Talon+Tres,+Las+Piñas+City"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 h-12 rounded-full bg-[#121212] text-white hover:bg-[#2b2b2b] transition-colors font-medium cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
                Visit Our Physical Store!
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
