"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { type CSSProperties, type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  PackageSearch,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import ProductCard from "@/components/catalog/ProductCard";
import { InfiniteSlider } from "@/components/motion-primitives/infinite-slider";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ANNOUNCEMENT_SLUG } from "@/lib/business-details/business-details";
import { resolveProductPlaceholder } from "@/lib/images/product-placeholder";
import { type CatalogApiProduct, type Product } from "@/types/product.types";

function toViewProduct(product: CatalogApiProduct): Product {
  return {
    id: product.id,
    name: product.name,
    category: product.categoryPath,
    type: product.categoryName,
    price: product.price,
    brand: product.brand,
    size: product.size,
    condition: product.condition,
    description: product.description,
    stock: product.stock,
    isNewArrival: product.isNewArrival,
    images: product.images,
  };
}

function buildProductPath(productId: string, fromPath: string) {
  return `/product/${productId}?from=${encodeURIComponent(fromPath)}`;
}

function getSafeInternalPath(candidatePath: string | null, fallbackPath: string) {
  if (!candidatePath || !candidatePath.startsWith("/") || candidatePath.startsWith("//")) {
    return fallbackPath;
  }

  return candidatePath;
}

function formatPrice(price: number) {
  return `₱${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&apos;|&#39;|&rsquo;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? "-100%" : "100%", opacity: 0 }),
};

const ZOOM_FACTOR = 2.5;
const ZOOM_PANEL_SIZE = 320;

export default function ProductDetailsClient({ 
  productId,
  initialProduct,
  initialCatalog
}: { 
  productId: string,
  initialProduct?: CatalogApiProduct | null,
  initialCatalog?: CatalogApiProduct[]
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPath = useMemo(() => getSafeInternalPath(searchParams.get("from"), "/collection"), [searchParams]);

  const [announcementText, setAnnouncementText] = useState<string | null>(null);
  const [product, setProduct] = useState<CatalogApiProduct | null>(initialProduct || null);
  const [products, setProducts] = useState<CatalogApiProduct[]>(initialCatalog || []);
  const [loading, setLoading] = useState(!initialProduct);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [zoomPanelStyle, setZoomPanelStyle] = useState<CSSProperties>({});
  const [bgPos, setBgPos] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialProduct && initialCatalog) return; // Skip fetch if pre-loaded by server

    const fetchProductPageData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [productResponse, catalogResponse] = await Promise.all([
          fetch(`/api/catalog/product/${productId}`, { cache: "no-store" }),
          fetch("/api/catalog", { cache: "no-store" }),
        ]);
        const [productResult, catalogResult] = await Promise.all([
          productResponse.json(),
          catalogResponse.json(),
        ]);

        if (!productResponse.ok) {
          throw new Error(productResult.error || "Failed to load product");
        }

        if (!catalogResponse.ok) {
          throw new Error(catalogResult.error || "Failed to load catalog");
        }

        setProduct(productResult.data || null);
        setProducts(catalogResult.data?.products || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load product");
        setProduct(null);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProductPageData();
  }, [productId, initialProduct, initialCatalog]);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const response = await fetch(`/api/business-details?slug=${ANNOUNCEMENT_SLUG}`, { cache: "no-store" });
        const result = await response.json();

        if (!response.ok) {
          return;
        }

        const rawAnnouncement = result?.data?.body;
        if (typeof rawAnnouncement === "string" && rawAnnouncement.trim()) {
          setAnnouncementText(rawAnnouncement.trim());
        }
      } catch {
      }
    };

    fetchAnnouncement();
  }, []);

  useEffect(() => {
    setSelectedImage(0);
    setSlideDirection(1);
    setIsZoomed(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [productId]);

  const breadcrumbSegments = useMemo(() => {
    if (!product) {
      return [];
    }

    return product.categoryPath.split(" > ").filter(Boolean);
  }, [product]);

  const relatedProducts = useMemo(() => {
    if (!product) {
      return [];
    }

    const sameCategory = products.filter(
      (item) => item.id !== product.id && item.categoryId === product.categoryId
    );

    const sameRoot = products.filter((item) => {
      if (item.id === product.id) {
        return false;
      }

      const [itemRoot] = item.categoryPath.split(" > ");
      const [productRoot] = product.categoryPath.split(" > ");
      return itemRoot === productRoot;
    });

    const newestFallback = products.filter((item) => item.id !== product.id);

    const combined = [...sameCategory, ...sameRoot, ...newestFallback];
    const unique = combined.filter(
      (item, index, list) => list.findIndex((entry) => entry.id === item.id) === index
    );

    return unique.slice(0, 4);
  }, [product, products]);

  const currentImageSrc = product
    ? product.images[selectedImage] || resolveProductPlaceholder(product.categoryPath)
    : resolveProductPlaceholder(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current || !isZoomed) return;

    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    setBgPos({ x, y });
    setLensPos({ x: e.clientX - left, y: e.clientY - top });

    const panelX = e.clientX - left > width / 2 ? -ZOOM_PANEL_SIZE - 20 : width + 20;
    setZoomPanelStyle({
      left: panelX,
      top: 0,
    });
  };

  const paginate = (newDirection: number) => {
    if (!product) return;
    const nextImage = (selectedImage + newDirection + product.images.length) % product.images.length;
    setSlideDirection(newDirection);
    setSelectedImage(nextImage);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7">
              <Skeleton className="aspect-4/5 w-full rounded-2xl" />
            </div>
            <div className="lg:col-span-5 space-y-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-white px-4">
        <Empty className="max-w-md w-full">
          <EmptyMedia>
            <PackageSearch className="w-16 h-16 text-gray-300" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle className="text-2xl font-serif text-gray-900">
              Product Not Found
            </EmptyTitle>
            <EmptyDescription className="text-gray-500">
              The item you're looking for might have been moved or is no longer available.
            </EmptyDescription>
          </EmptyHeader>
          <div className="mt-8">
            <Button 
              onClick={() => router.push(fromPath)}
              className="bg-gray-900 hover:bg-gray-800 text-white px-8 h-12 rounded-full font-medium transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Catalog
            </Button>
          </div>
        </Empty>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white selection:bg-gray-100">
      {announcementText && (
        <div className="bg-gray-900 text-white py-2.5 px-4 text-center text-sm font-medium tracking-wide">
          {announcementText}
        </div>
      )}

      <main className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8 md:mb-12 overflow-x-auto whitespace-nowrap pb-2">
          <Link href={fromPath} className="hover:text-gray-900 transition-colors flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          <span className="text-gray-300">/</span>
          {breadcrumbSegments.map((segment, idx) => (
            <div key={segment} className="flex items-center space-x-2">
              <span className="capitalize">{decodeHtmlEntities(segment)}</span>
              {idx < breadcrumbSegments.length - 1 && <span className="text-gray-300">/</span>}
            </div>
          ))}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-7 order-1">
            <div className="relative group">
              <div 
                ref={imageContainerRef}
                className="relative aspect-4/5 rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 cursor-zoom-in"
                onMouseEnter={() => setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
                onMouseMove={handleMouseMove}
              >
                <AnimatePresence initial={false} custom={slideDirection} mode="wait">
                  <motion.div
                    key={selectedImage}
                    custom={slideDirection}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 }
                    }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={currentImageSrc}
                      alt={product.name}
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 60vw"
                    />
                  </motion.div>
                </AnimatePresence>

                {isZoomed && (
                  <div 
                    className="absolute pointer-events-none border-2 border-white/50 shadow-2xl rounded-2xl overflow-hidden hidden md:block"
                    style={{
                      width: ZOOM_PANEL_SIZE,
                      height: ZOOM_PANEL_SIZE,
                      ...zoomPanelStyle,
                      backgroundImage: `url(${currentImageSrc})`,
                      backgroundPosition: `${bgPos.x}% ${bgPos.y}%`,
                      backgroundSize: `${ZOOM_FACTOR * 100}%`,
                      zIndex: 50,
                    }}
                  />
                )}
                
                {product.images.length > 1 && (
                  <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); paginate(-1); }}
                      className="p-3 rounded-full bg-white/90 backdrop-blur-sm text-gray-900 pointer-events-auto hover:bg-white transition-all shadow-lg active:scale-95"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); paginate(1); }}
                      className="p-3 rounded-full bg-white/90 backdrop-blur-sm text-gray-900 pointer-events-auto hover:bg-white transition-all shadow-lg active:scale-95"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 flex space-x-3 overflow-x-auto pb-4 scrollbar-hide">
                {product.images.map((img, idx) => (
                  <button
                    key={img}
                    onClick={() => {
                      setSlideDirection(idx > selectedImage ? 1 : -1);
                      setSelectedImage(idx);
                    }}
                    className={`relative w-20 aspect-square rounded-xl overflow-hidden shrink-0 transition-all border-2 ${
                      selectedImage === idx ? "border-gray-900 scale-105 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} view ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 order-2 flex flex-col">
            <div className="flex-1 space-y-8">
              <div className="space-y-4">
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold tracking-widest uppercase rounded-full">
                  {decodeHtmlEntities(product.categoryName)}
                </span>
                <h1 className="text-4xl md:text-5xl font-serif text-gray-900 leading-tight">
                  {decodeHtmlEntities(product.name)}
                </h1>
                <div className="flex items-baseline space-x-4">
                  <span className="text-3xl font-medium text-gray-900">{formatPrice(product.price)}</span>
                  {product.stock <= 5 && product.stock > 0 && (
                    <span className="text-sm font-semibold text-rose-600 animate-pulse">
                      Only {product.stock} left!
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-6 pt-8 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Size</span>
                    <p className="text-lg font-medium text-gray-900">{product.size}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Brand</span>
                    <p className="text-lg font-medium text-gray-900">{product.brand}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Condition</span>
                    <p className="text-lg font-medium text-gray-900 capitalize">{product.condition}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Availability</span>
                    <p className={`text-lg font-medium ${product.stock > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {product.stock > 0 ? "In Stock" : "Out of Stock"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Description</span>
                  <div 
                    className="text-gray-600 leading-relaxed text-lg"
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                </div>
              </div>

              <div className="pt-8 space-y-4">
                <div className="flex items-start p-4 bg-gray-50 rounded-2xl space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">
                    Available for preview and pickup at our boutique. Items are meticulously curated and one-of-a-kind.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-24 md:mt-32 pt-16 border-t border-gray-100">
            <div className="flex items-end justify-between mb-12">
              <div className="space-y-2">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">More for you</span>
                <h2 className="text-3xl md:text-4xl font-serif text-gray-900">Recommended Pieces</h2>
              </div>
            </div>

            <InfiniteSlider speed={30} gap={24} speedOnHover={50}>
              {relatedProducts.map((item) => (
                <div key={item.id} className="w-[280px] md:w-[320px]">
                  <ProductCard product={toViewProduct(item)} />
                </div>
              ))}
            </InfiniteSlider>
          </section>
        )}
      </main>
    </div>
  );
}
