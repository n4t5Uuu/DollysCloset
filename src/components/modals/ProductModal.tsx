"use client";

import { Product } from "@/types/product.types";
import Image from "next/image";
import { useState, useRef, useCallback } from "react";
import { X, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { resolveProductPlaceholder } from "@/lib/product-placeholder";
import { AnimatePresence, motion } from "motion/react";

interface ProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onExitComplete?: () => void;
}

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? "-100%" : "100%", opacity: 0 }),
};

const ZOOM_FACTOR = 2.5;
const ZOOM_PANEL_SIZE = 380;

export default function ProductModal({ product, isOpen, onClose, onExitComplete }: ProductModalProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [zoomPanelStyle, setZoomPanelStyle] = useState<React.CSSProperties>({});
  const [bgPos, setBgPos] = useState({ x: 0, y: 0 });

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const totalImages = product.images.length;
  const currentImageSrc = product.images[selectedImage] || resolveProductPlaceholder(product.category);

  const lensW = ZOOM_PANEL_SIZE / ZOOM_FACTOR;
  const lensH = ZOOM_PANEL_SIZE / ZOOM_FACTOR;

  const goToImage = (index: number, direction?: number) => {
    setIsZoomed(false);
    setSlideDirection(direction ?? (index > selectedImage ? 1 : -1));
    setSelectedImage(index);
  };

  const goPrev = () => goToImage((selectedImage - 1 + totalImages) % totalImages, -1);
  const goNext = () => goToImage((selectedImage + 1) % totalImages, 1);

  const handleMouseLeave = useCallback(() => {
    setIsZoomed(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsZoomed(true);
    const imgEl = imageContainerRef.current;
    const cardEl = cardRef.current;
    if (!imgEl || !cardEl) return;

    const imgRect = imgEl.getBoundingClientRect();
    const cardRect = cardEl.getBoundingClientRect();

    // Cursor position relative to image
    const cx = e.clientX - imgRect.left;
    const cy = e.clientY - imgRect.top;

    // Clamp lens so it stays fully inside the image
    const lx = Math.max(0, Math.min(cx - lensW / 2, imgRect.width - lensW));
    const ly = Math.max(0, Math.min(cy - lensH / 2, imgRect.height - lensH));
    setLensPos({ x: lx, y: ly });

    // Background-position for the zoom panel: maps lens position to zoomed image offset
    const bgX = -(lx * ZOOM_FACTOR);
    const bgY = -(ly * ZOOM_FACTOR);
    setBgPos({ x: bgX, y: bgY });

    // Position zoom panel to the left of the modal card, vertically centered on cursor
    const panelLeft = cardRect.left - ZOOM_PANEL_SIZE - 16;
    let panelTop = e.clientY - ZOOM_PANEL_SIZE / 2;
    panelTop = Math.max(8, Math.min(panelTop, window.innerHeight - ZOOM_PANEL_SIZE - 8));

    setZoomPanelStyle({
      position: "fixed",
      left: Math.max(8, panelLeft),
      top: panelTop,
      width: ZOOM_PANEL_SIZE,
      height: ZOOM_PANEL_SIZE,
      zIndex: 60,
    });
  }, [lensW, lensH]);

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {isOpen && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            ref={cardRef}
            key="card"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-full transition-colors z-10 text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left Side - Images */}
              <div className="p-6 space-y-3">
                {/* Main Image */}
                <div
                  ref={imageContainerRef}
                  className="aspect-3/4 bg-gray-100 rounded-xl overflow-hidden relative cursor-crosshair"
                  onMouseLeave={handleMouseLeave}
                  onMouseMove={handleMouseMove}
                >
                  <AnimatePresence custom={slideDirection} mode="popLayout">
                    <motion.div
                      key={selectedImage}
                      custom={slideDirection}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={currentImageSrc}
                        alt={product.name}
                        fill
                        className="object-cover"
                        draggable={false}
                      />
                    </motion.div>
                  </AnimatePresence>

                  {/* Lens */}
                  {isZoomed && (
                    <div
                      className="absolute border-2 border-[#E7A3B0] bg-white/20 pointer-events-none z-10"
                      style={{ left: lensPos.x, top: lensPos.y, width: lensW, height: lensH }}
                    />
                  )}

                  {/* Prev / Next arrows */}
                  {totalImages > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); goPrev(); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-md transition-all hover:scale-110 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); goNext(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-md transition-all hover:scale-110 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-700" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails */}
                {totalImages > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {product.images.map((image: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => goToImage(index)}
                        className={`aspect-square bg-gray-100 rounded-lg overflow-hidden relative border-2 transition-colors cursor-pointer ${
                          selectedImage === index ? "border-[#E7A3B0]" : "border-transparent"
                        }`}
                      >
                        <Image
                          src={image}
                          alt={`${product.name} ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Side - Details */}
              <div className="p-6 md:p-8 flex flex-col justify-between border-l border-gray-100">
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.2em] text-[#E7A3B0] uppercase mb-2">
                      {product.category}
                    </p>
                    <h2 className="text-2xl font-bold font-playfair-display text-[#121212] leading-snug">
                      {product.name}
                    </h2>
                  </div>

                  <p className="text-3xl font-bold text-[#E7A3B0] font-oswald tracking-wide">
                    ₱{product.price.toFixed(2)}
                  </p>

                  <div className="divide-y divide-gray-100">
                    {[
                      { label: "Brand", value: product.brand },
                      { label: "Size", value: product.size },
                      { label: "Condition", value: product.condition },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-3">
                        <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
                          {label}
                        </span>
                        <span className="text-sm text-[#121212] font-medium">{value}</span>
                      </div>
                    ))}

                    <div className="flex items-center justify-between py-3">
                      <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
                        Stock
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#121212]">
                        <span className={`w-2 h-2 rounded-full ${product.stock > 0 ? "bg-green-400" : "bg-red-400"}`} />
                        {product.stock > 0 ? `${product.stock} available` : "Out of stock"}
                      </span>
                    </div>
                  </div>

                  {product.description && (
                    <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center gap-2 text-center">
                  <MapPin className="w-4 h-4 text-[#E7A3B0]" />
                  <p className="text-base font-semibold italic font-playfair-display text-[#121212]">
                    Visit Our Physical Store
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Zoom result panel — to the LEFT of the modal card */}
          {isZoomed && (
            <div
              className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 pointer-events-none"
              style={zoomPanelStyle}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImageSrc}
                alt=""
                style={{
                  display: "block",
                  width: (imageContainerRef.current?.offsetWidth ?? 0) * ZOOM_FACTOR,
                  height: (imageContainerRef.current?.offsetHeight ?? 0) * ZOOM_FACTOR,
                  objectFit: "cover",
                  transform: `translate(${bgPos.x}px, ${bgPos.y}px)`,
                  maxWidth: "none",
                }}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
