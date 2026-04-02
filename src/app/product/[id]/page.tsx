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
import { resolveProductPlaceholder } from "@/lib/product-placeholder";
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

export default function ProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = String(params?.id ?? "");
  const fromPath = useMemo(() => getSafeInternalPath(searchParams.get("from"), "/collection"), [searchParams]);

  const [announcementText, setAnnouncementText] = useState<string | null>(null);
  const [product, setProduct] = useState<CatalogApiProduct | null>(null);
  const [products, setProducts] = useState<CatalogApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [zoomPanelStyle, setZoomPanelStyle] = useState<CSSProperties>({});
  const [bgPos, setBgPos] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, [productId]);

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
  const lensW = ZOOM_PANEL_SIZE / ZOOM_FACTOR;
  const lensH = ZOOM_PANEL_SIZE / ZOOM_FACTOR;

  const goToImage = (index: number, direction?: number) => {
    setIsZoomed(false);
    setSlideDirection(direction ?? (index > selectedImage ? 1 : -1));
    setSelectedImage(index);
  };

  const handleMouseLeave = () => {
    setIsZoomed(false);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 1024) {
      setIsZoomed(false);
      return;
    }

    const imageElement = imageContainerRef.current;
    if (!imageElement) return;

    setIsZoomed(true);
    const imageRect = imageElement.getBoundingClientRect();
    const cx = e.clientX - imageRect.left;
    const cy = e.clientY - imageRect.top;

    const lx = Math.max(0, Math.min(cx - lensW / 2, imageRect.width - lensW));
    const ly = Math.max(0, Math.min(cy - lensH / 2, imageRect.height - lensH));
    setLensPos({ x: lx, y: ly });
    setBgPos({ x: -(lx * ZOOM_FACTOR), y: -(ly * ZOOM_FACTOR) });

    let panelLeft = imageRect.right + 20;
    if (panelLeft + ZOOM_PANEL_SIZE > window.innerWidth - 16) {
      panelLeft = imageRect.left - ZOOM_PANEL_SIZE - 20;
    }

    let panelTop = e.clientY - ZOOM_PANEL_SIZE / 2;
    panelTop = Math.max(16, Math.min(panelTop, window.innerHeight - ZOOM_PANEL_SIZE - 16));

    setZoomPanelStyle({
      position: "fixed",
      left: Math.max(16, panelLeft),
      top: panelTop,
      width: ZOOM_PANEL_SIZE,
      height: ZOOM_PANEL_SIZE,
      zIndex: 50,
    });
  };

  const renderLoadingState = () => (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <div className="space-y-3 mb-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-36" />
      </div>

      <div className="grid gap-6 xl:gap-10 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-[112px_minmax(0,1fr)] md:items-start md:gap-3">
          <Skeleton className="aspect-[4/4.8] w-full rounded-[24px] md:col-start-2 md:row-start-1 lg:h-[calc(112px*5+2.5rem)] lg:max-h-[calc(112px*5+2.5rem)] lg:aspect-auto" />
            <div className="grid grid-cols-4 gap-2.5 md:col-start-1 md:row-start-1 md:grid-cols-1 md:gap-2.5">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="aspect-square rounded-[18px]" />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-24 w-full rounded-[24px]" />
          <Skeleton className="h-28 w-full rounded-[24px]" />
        </div>
      </div>
    </div>
  );

  const renderMissingState = (message: string) => (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
      <div className="mb-8">
        <Button asChild variant="ghost" className="rounded-full px-0 text-[#8A5B64] hover:bg-transparent hover:text-[#cc7f8f]">
          <Link href={fromPath}>
            <ArrowLeft className="h-4 w-4" />
            Back to Collection
          </Link>
        </Button>
      </div>

      <Empty className="border-dashed border-[#E7A3B0]/20 bg-white/80">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-[#fff0f5]">
            <PackageSearch className="size-6 text-[#E7A3B0]" />
          </EmptyMedia>
          <EmptyTitle className="font-playfair-display text-2xl">Product unavailable</EmptyTitle>
          <EmptyDescription className="font-montserrat">
            {message}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );

  return (
    <main className="w-full flex flex-col items-center bg-[linear-gradient(180deg,#ffffff_0%,#fff9fb_42%,#ffffff_100%)]">
      {announcementText && (
        <div className="w-full py-3 bg-[#E7A3B0] flex items-center justify-center">
          <InfiniteSlider className="w-full h-full">
            {Array.from({ length: 20 }).map((_, index) => (
              <h2 key={index} className="font-oswald font-medium text-[10px] md:text-sm tracking-[0.2em] text-[#121212] uppercase whitespace-nowrap">
                {announcementText}
              </h2>
            ))}
          </InfiniteSlider>
        </div>
      )}

      {loading ? renderLoadingState() : error ? renderMissingState(error) : !product ? renderMissingState("This item could not be found in the collection.") : (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
          <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
            <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#8A5B64]">
              <Link href={fromPath} className="hover:text-[#cc7f8f] transition-colors">Collection</Link>
              {breadcrumbSegments.map((segment) => (
                <span key={segment} className="contents">
                  <span className="text-[#d6a5af]">/</span>
                  <span>{segment}</span>
                </span>
              ))}
              <span className="text-[#d6a5af]">/</span>
              <span className="text-[#121212] font-medium">{product.name}</span>
            </nav>

            <Button asChild variant="ghost" className="h-auto rounded-full px-0 text-[#8A5B64] hover:bg-transparent hover:text-[#cc7f8f]">
              <Link href={fromPath}>
                <ArrowLeft className="h-4 w-4" />
                Back to Collection
              </Link>
            </Button>
          </div>

          <section className="grid gap-6 xl:gap-10 lg:grid-cols-[minmax(0,1fr)_430px] items-start">
            <div className="space-y-3 md:space-y-0 mx-auto w-full max-w-[568px] md:grid md:grid-cols-[112px_minmax(0,1fr)] md:items-start md:gap-3">
              <div
                ref={imageContainerRef}
                className="relative aspect-[4/4.8] overflow-hidden rounded-[24px] bg-[#f7f3f4] shadow-[0_30px_80px_-40px_rgba(187,117,132,0.45)] cursor-default lg:cursor-crosshair md:col-start-2 md:row-start-1 md:aspect-[4/4.5] lg:h-[calc(112px*5+2.5rem)] lg:max-h-[calc(112px*5+2.5rem)] lg:aspect-auto"
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
              >
                <AnimatePresence custom={slideDirection} mode="wait" initial={false}>
                  <motion.div
                    key={`${currentImageSrc}-${selectedImage}`}
                    custom={slideDirection}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.28, ease: "easeInOut" }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={currentImageSrc}
                      alt={product.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 520px"
                      className="object-cover"
                      priority
                      unoptimized
                      draggable={false}
                    />
                  </motion.div>
                </AnimatePresence>

                {isZoomed && (
                  <div
                    className="absolute z-10 hidden border-2 border-[#E7A3B0] bg-white/20 pointer-events-none lg:block"
                    style={{ left: lensPos.x, top: lensPos.y, width: lensW, height: lensH }}
                  />
                )}

                {product.isNewArrival && (
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-4 py-1.5 text-[11px] font-oswald uppercase tracking-[0.24em] text-[#8A5B64] shadow-sm">
                    New Arrival
                  </span>
                )}

                {product.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => goToImage((selectedImage - 1 + product.images.length) % product.images.length, -1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-[#8A5B64] shadow-md transition hover:bg-white"
                      aria-label="Previous product image"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => goToImage((selectedImage + 1) % product.images.length, 1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-[#8A5B64] shadow-md transition hover:bg-white"
                      aria-label="Next product image"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>

              {product.images.length > 1 && (
                <div className="grid grid-cols-5 gap-2 md:col-start-1 md:row-start-1 md:grid-cols-1 md:gap-2.5 md:sticky md:top-[112px]">
                  {product.images.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => goToImage(index)}
                      className={`relative aspect-square overflow-hidden rounded-[18px] border transition-all ${
                        selectedImage === index
                          ? "border-[#E7A3B0] shadow-[0_18px_40px_-28px_rgba(187,117,132,0.65)]"
                          : "border-[#f0dde1] hover:border-[#E7A3B0]/70"
                      }`}
                      aria-label={`View image ${index + 1}`}
                    >
                      <Image
                        src={image}
                        alt={`${product.name} thumbnail ${index + 1}`}
                        fill
                        sizes="(max-width: 1024px) 22vw, 112px"
                        className="object-cover"
                        unoptimized
                        draggable={false}
                      />
                    </button>
                  ))}
                </div>
              )}

              {isZoomed && (
                <div
                  className="hidden overflow-hidden rounded-[24px] border border-[#f0dde1] bg-white shadow-2xl pointer-events-none lg:block"
                  style={zoomPanelStyle}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentImageSrc}
                    alt=""
                    draggable={false}
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
            </div>

            <aside className="lg:sticky lg:top-[108px]">
              <div className="rounded-[28px] border border-[#f2dbe0] bg-white/92 p-5 md:p-6 lg:px-7 shadow-[0_28px_70px_-38px_rgba(187,117,132,0.35)] backdrop-blur">
                <div className="space-y-5">
                  <div className="space-y-2.5">
                    <h1 className="font-playfair-display text-xl md:text-[2.2rem] leading-tight text-[#121212]">
                      {product.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="font-oswald text-xl md:text-[1.7rem] tracking-wide text-[#E7A3B0]">
                        {formatPrice(product.price)}
                      </p>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        product.stock > 0
                          ? "bg-[#edf8f0] text-[#2f7a49]"
                          : "bg-[#fff0f0] text-[#b65252]"
                      }`}>
                        {product.stock > 0 ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-[20px] bg-[#fff8fa] p-4 md:p-5">
                    <div className="space-y-3">
                      {[
                        { label: "Brand", value: product.brand },
                        { label: "Size", value: product.size },
                        { label: "Condition", value: product.condition },
                        { label: "Availability", value: product.stock > 0 ? `${product.stock} piece${product.stock > 1 ? "s" : ""} available` : "Currently sold out" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-start justify-between gap-4 border-b border-[#f2dbe0] pb-2.5 last:border-b-0 last:pb-0">
                          <span className="font-oswald text-[11px] uppercase tracking-[0.24em] text-[#b98b96]">
                            {item.label}
                          </span>
                          <span className="text-right text-sm text-[#121212] font-medium">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="font-playfair-display text-lg md:text-xl text-[#121212]">Description</h2>
                    <p className="text-sm leading-6 text-[#5f5a5c]">
                      {decodeHtmlEntities(product.description || "A thoughtfully curated piece from Dolly's Closet, chosen for its style, condition, and timeless wearability.")}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2.5 pt-1">
                    <Button asChild className="h-11 rounded-full bg-[#121212] text-white hover:bg-[#2b2b2b]">
                      <a 
                        href="https://www.google.com/maps/search/?api=1&query=04+Admiral,+Talon+Tres,+Las+Piñas+City"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin className="h-4 w-4" />
                        Visit Our Physical Store
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="h-11 rounded-full border-[#E7A3B0]/50 text-[#8A5B64] hover:bg-[#fff0f5] hover:text-[#8A5B64]">
                      <Link href={fromPath}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to Collection
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </aside>
          </section>

          {relatedProducts.length > 0 && (
            <section className="mt-16 md:mt-20 space-y-6">
              <div className="space-y-2">
                <p className="font-oswald text-xs uppercase tracking-[0.28em] text-[#cc7f8f]">
                  More to Explore
                </p>
                <h2 className="font-playfair-display text-2xl md:text-3xl text-[#121212]">
                  You May Also Like
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4 md:gap-x-6 md:gap-y-10">
                {relatedProducts.map((relatedProduct) => (
                  <ProductCard
                    key={relatedProduct.id}
                    product={toViewProduct(relatedProduct)}
                    onClick={() => router.push(buildProductPath(relatedProduct.id, fromPath), { scroll: true })}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
