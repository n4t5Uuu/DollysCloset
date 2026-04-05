"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type CSSProperties, type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MapPinned,
  PackageSearch,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import ProductCard from "../catalog/ProductCard";
import { InfiniteSlider } from "../motion-primitives/infinite-slider";
import { Button } from "../ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { Skeleton } from "../ui/skeleton";
import { 
  ANNOUNCEMENT_SLUG, 
  resolveProductPlaceholder, 
  cn,
  getContactDetails,
  createClient
} from "@dollys-closet/core";
import { type CatalogApiProduct, type Product, type ContactDetailsPayload } from "@dollys-closet/core";

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

function getSafeInternalPath(candidatePath: string | null, fallbackPath: string) {
  if (!candidatePath || !candidatePath.startsWith("/") || candidatePath.startsWith("//")) {
    return fallbackPath;
  }

  return candidatePath;
}

function formatPrice(price: number) {
  return `P${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export function ProductDetailsView({
  productId,
  initialProduct,
  initialCatalog,
}: {
  productId: string;
  initialProduct?: CatalogApiProduct | null;
  initialCatalog?: CatalogApiProduct[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPath = useMemo(() => getSafeInternalPath(searchParams.get("from"), "/collection"), [searchParams]);
  const [storeAddress, setStoreAddress] = useState<string>("");

  useEffect(() => {
    async function fetchStoreDetails() {
      try {
        const supabase = createClient();
        const { details } = await getContactDetails(supabase);
        if (details?.address) {
          setStoreAddress(details.address);
        }
      } catch (error) {
        console.error("Error fetching store details:", error);
      }
    }
    fetchStoreDetails();
  }, []);

  const handleVisitStore = () => {
    if (!storeAddress) return;
    const encodedAddress = encodeURIComponent(storeAddress);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank");
  };

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
    if (initialProduct && initialCatalog) return;

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
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Skeleton className="aspect-4/5 w-full rounded-2xl" />
            </div>
            <div className="space-y-6 lg:col-span-5">
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
            <PackageSearch className="h-16 w-16 text-gray-300" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle className="text-2xl font-serif text-gray-900">
              Product Not Found
            </EmptyTitle>
            <EmptyDescription className="text-gray-500">
              The item you&apos;re looking for might have been moved or is no longer available.
            </EmptyDescription>
          </EmptyHeader>
          <div className="mt-8">
            <Button
              onClick={() => router.push(fromPath)}
              className="h-12 rounded-full bg-gray-900 px-8 text-white transition-all hover:bg-gray-800"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
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
        <div className="bg-gray-900 px-4 py-2.5 text-center text-sm font-medium tracking-wide text-white">
          {announcementText}
        </div>
      )}

      <main className="container mx-auto px-4 pt-4 pb-8 md:px-6 md:pt-6 md:pb-12 lg:px-8">
        <nav className="mb-8 flex items-center space-x-2 overflow-x-auto whitespace-nowrap pb-2 text-sm text-gray-500 md:mb-12">
          <Link href={fromPath} className="flex items-center transition-colors hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
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

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="order-1 lg:col-span-6">
            <div className="group relative">
              <div
                ref={imageContainerRef}
                className="relative aspect-4/5 cursor-zoom-in overflow-hidden rounded-3xl border border-gray-100 bg-gray-50"
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
                      opacity: { duration: 0.2 },
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
                    className="absolute hidden overflow-hidden rounded-2xl border-2 border-white/50 shadow-2xl md:block"
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
                  <div className="pointer-events-none absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-between opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        paginate(-1);
                      }}
                      className="pointer-events-auto rounded-full bg-white/90 p-3 text-gray-900 shadow-lg transition-all hover:bg-white active:scale-95"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        paginate(1);
                      }}
                      className="pointer-events-auto rounded-full bg-white/90 p-3 text-gray-900 shadow-lg transition-all hover:bg-white active:scale-95"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </div>
                )}
              </div>

               <div className="mt-8 flex space-x-6 overflow-x-auto p-4 scrollbar-hide">
                 {product.images.map((img, idx) => (
                   <button
                     key={`${img}-${idx}`}
                     onClick={() => {
                       setSlideDirection(idx > selectedImage ? 1 : -1);
                       setSelectedImage(idx);
                     }}
                     className={`group relative aspect-square w-28 shrink-0 transition-all duration-300 ${
                       selectedImage === idx 
                         ? "scale-110 z-10" 
                         : "opacity-60 hover:opacity-100 hover:scale-105"
                     }`}
                   >
                     <div className={cn(
                       "absolute inset-0 rounded-2xl transition-all duration-300",
                       selectedImage === idx 
                         ? "ring-2 ring-gray-900 ring-offset-4 shadow-lg" 
                         : "ring-1 ring-gray-200"
                     )} />
                     
                     <div className="absolute inset-0 overflow-hidden rounded-2xl">
                       <Image
                         src={img}
                         alt={`${product.name} view ${idx + 1}`}
                         fill
                         className="object-cover"
                         sizes="112px"
                       />
                     </div>
                   </button>
                 ))}
               </div>
            </div>
          </div>

          <div className="order-2 flex flex-col lg:col-span-12 xl:col-span-5 min-w-0 px-2 lg:px-0">
            <div className="flex-1 space-y-8">
              <div className="space-y-4">
                <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-gray-600">
                  {decodeHtmlEntities(product.categoryName)}
                </span>
                <h1 className="text-4xl leading-tight text-gray-900 md:text-5xl break-words">
                  {decodeHtmlEntities(product.name)}
                </h1>
                <div className="flex items-baseline space-x-4">
                  <span className="text-3xl font-medium text-gray-900">{formatPrice(product.price)}</span>
                  {product.stock <= 5 && product.stock > 0 && (
                    <span className="animate-pulse text-sm font-semibold text-rose-600">
                      Only {product.stock} left!
                    </span>
                  )}
                </div>
              </div>

               <div className="space-y-6">
                 <div className="space-y-8 rounded-3xl border border-gray-200 p-8 shadow-sm">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-1 min-w-0">
                       <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Size</span>
                       <p className="text-lg font-medium text-gray-900 break-words overflow-hidden">{product.size}</p>
                     </div>
                     <div className="space-y-1 min-w-0">
                       <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Brand</span>
                       <p className="text-lg font-medium text-gray-900 break-words overflow-hidden">{product.brand}</p>
                     </div>
                     <div className="space-y-1 min-w-0">
                       <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Condition</span>
                       <p className="text-lg font-medium capitalize text-gray-900 break-words overflow-hidden">{product.condition}</p>
                     </div>
                     <div className="space-y-1 min-w-0">
                       <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Availability</span>
                       <p className={`text-lg font-medium ${product.stock > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                         {product.stock > 0 ? "In Stock" : "Out of Stock"}
                       </p>
                     </div>
                   </div>
    
                   <div className="space-y-3 border-t border-gray-100 pt-6">
                     <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Description</span>
                     <div
                       className="text-lg leading-relaxed text-gray-600 break-words overflow-hidden"
                       dangerouslySetInnerHTML={{ __html: product.description }}
                     />
                   </div>
                 </div>
 
                 <div className="flex items-start space-x-3 rounded-2xl bg-gray-100 p-4 transition-colors">
                   <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
                   <p className="text-sm text-gray-700">
                     Available for preview and pickup at our boutique. Items are meticulously curated and one-of-a-kind.
                   </p>
                 </div>
 
                 <Button 
                   onClick={handleVisitStore}
                   disabled={!storeAddress}
                   className="w-full bg-gray-900 py-6 text-base font-medium text-white hover:bg-gray-800 rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-[0.98]"
                 >
                   <MapPinned className="h-5 w-5" />
                   <span className="font-oswald uppercase tracking-wider">Visit our physical store</span>
                 </Button>
               </div>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-24 border-t border-gray-100 pt-16 md:mt-32">
            <div className="mb-12 flex items-end justify-between">
              <div className="space-y-2">
                <span className="text-sm font-bold uppercase tracking-widest text-gray-400">More for you</span>
                <h2 className="text-3xl text-gray-900 md:text-4xl">Recommended Pieces</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
               {relatedProducts.map((item) => (
                 <ProductCard key={item.id} product={toViewProduct(item)} />
               ))}
             </div>
          </section>
        )}
      </main>
    </div>
  );
}
