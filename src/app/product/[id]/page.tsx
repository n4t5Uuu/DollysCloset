import { admin } from "@/lib/supabase/admin";
import { type CatalogApiProduct } from "@/types/product.types";
import ProductDetailsClient from "@/components/catalog/ProductDetailsClient";
import { type Metadata, type ResolvingMetadata } from "next";
import { resolveProductPlaceholder } from "@/lib/images/product-placeholder";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getProduct(id: string): Promise<CatalogApiProduct | null> {
  const { data, error } = await admin
    .from("products")
    .select("*, category:categories(name, parent:parent_id(name))")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  // Manual join processing if needed, though usually Next.js handles this
  return data as CatalogApiProduct;
}

async function getCatalog(): Promise<CatalogApiProduct[]> {
  const { data, error } = await admin
    .from("products")
    .select("*, category:categories(name, parent:parent_id(name))")
    .limit(20);

  return (data as CatalogApiProduct[]) || [];
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = (await params).id;
  const product = await getProduct(id);

  if (!product) {
    return {
      title: "Product Not Found",
    };
  }

  const previousImages = (await parent).openGraph?.images || [];
  const productImage = product.images[0] || resolveProductPlaceholder(product.categoryPath);

  return {
    title: `${product.name} | ${product.brand}`,
    description: product.description.replace(/<[^>]*>/g, "").slice(0, 160),
    openGraph: {
      title: `${product.name} | Dolly's Closet`,
      description: `Check out this ${product.name} from Dolly's Closet. Available for viewing in our boutique.`,
      images: [productImage, ...previousImages],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: `Special piece from Dolly's Closet: ${product.name}`,
      images: [productImage],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const id = (await params).id;
  
  // Prefetch data on server for instant load
  const [product, catalog] = await Promise.all([
    getProduct(id),
    getCatalog()
  ]);

  return (
<<<<<<< HEAD
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
              <span className="text-[#121212] font-medium break-words [overflow-wrap:anywhere]">{product.name}</span>
            </nav>

            <Button asChild variant="ghost" className="h-auto rounded-full px-0 text-[#8A5B64] hover:bg-transparent hover:text-[#cc7f8f]">
              <Link href={fromPath}>
                <ArrowLeft className="h-4 w-4" />
                Back to Collection
              </Link>
            </Button>
          </div>

          <section className="grid gap-6 xl:gap-10 lg:grid-cols-[minmax(0,1fr)_520px] items-start">
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
                    <h1 className="font-playfair-display text-xl md:text-[2.2rem] font-bold leading-tight text-[#2d2226] break-words [overflow-wrap:anywhere]">
                      {product.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="font-oswald text-xl md:text-[1.7rem] font-bold tracking-wide text-[#2d2226]">
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
                        <div key={item.label} className="flex min-w-0 items-start justify-between gap-4 border-b border-[#f2dbe0] pb-2.5 last:border-b-0 last:pb-0">
                          <span className="font-oswald text-[11px] uppercase tracking-[0.24em] text-[#8a7a80]">
                            {item.label}
                          </span>
                          <span className="max-w-[60%] text-right text-sm font-medium text-[#121212] break-words [overflow-wrap:anywhere]">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="font-playfair-display text-lg md:text-xl text-[#121212]">Description</h2>
                    <p className="text-sm leading-6 text-[#5f5a5c] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
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
=======
    <ProductDetailsClient 
      productId={id} 
      initialProduct={product} 
      initialCatalog={catalog} 
    />
>>>>>>> e144923558a9cdc35a536bb32461f4364035461e
  );
}
