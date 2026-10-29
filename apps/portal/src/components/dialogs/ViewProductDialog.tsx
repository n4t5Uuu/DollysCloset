import { useEffect } from "react";
/* eslint-disable @next/next/no-img-element */
import { InventoryProduct as Product, InventoryProductImage as ProductImage, Season } from "@dollys-closet/core";
import { X, Eye, EyeOff, Tag, Package, Ruler, BadgePercent, Clock, Calendar, CalendarRange } from "lucide-react";
import { getSeasonColor } from "@/components/seasons/SeasonCalendar";

interface ViewProductDialogProps {
  product: Product | null;
  images: ProductImage[];
  selectedImage: string | null;
  onSelectedImageChange: (url: string | null) => void;
  onClose: () => void;
  getCategoryName: (id: number) => string;
  seasons?: Season[];
}

export default function ViewProductDialog({
  product,
  images,
  selectedImage,
  onSelectedImageChange,
  onClose,
  getCategoryName,
  seasons = [],
}: ViewProductDialogProps) {
  useEffect(() => {
    if (!product) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, product]);

  if (!product) return null;

  const orderedImages = [...images].sort((a, b) => {
    if (a.is_primary === b.is_primary) return a.display_order - b.display_order;
    return a.is_primary ? -1 : 1;
  });

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const lastUpdated = product.updated_at || product.time_updated || null;

  const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
  const season =
    product.season_id && seasons.length > 0
      ? seasons.find((s) => String(s.id) === String(product.season_id)) ?? null
      : null;
  const formatSeasonWindow = (s: Season) =>
    `${MONTH_ABBR[s.startMonth - 1]} ${s.startDay} \u2013 ${MONTH_ABBR[s.endMonth - 1]} ${s.endDay}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(event) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    }}>
      <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-[#E7A3B0]/20 shadow-[0_24px_80px_rgba(17,24,39,0.28)]" onClick={(event) => event.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E7A3B0]/15 bg-[#fffafc] px-6 py-5 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
              <Package className="h-5 w-5 text-[#E7A3B0]" />
              Product Details
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Review product information, images, and current catalog visibility.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-white hover:text-gray-700"
            aria-label="Close product details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-5">
          {/* Images */}
          <div className="w-full">
            {images.length > 0 ? (
              <>
                <div className="w-full h-72 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-center p-2">
                  <img
                    src={selectedImage || orderedImages[0].image_url}
                    alt={product.product_name}
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                {orderedImages.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {orderedImages.map((image) => {
                      const isSelected = (selectedImage || orderedImages[0].image_url) === image.image_url;
                      return (
                        <button
                          key={image.image_id}
                          type="button"
                          onClick={() => onSelectedImageChange(image.image_url)}
                          className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${isSelected ? "border-[#E7A3B0] shadow-sm" : "border-transparent hover:border-[#E7A3B0]/40"}`}
                          aria-label="Select product image"
                        >
                          <img
                            src={image.image_url}
                            alt={`${product.product_name} thumbnail`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-48 rounded-2xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
                No image available
              </div>
            )}
          </div>

          {/* Product name + visibility badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b47c88] mb-1">Product Name</p>
              <p className="text-lg font-bold text-gray-900 break-words [overflow-wrap:anywhere]">{product.product_name}</p>
            </div>
            <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${product.show_in_catalog ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-600 border border-gray-200"}`}>
              {product.show_in_catalog ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {product.show_in_catalog ? "Listed" : "Hidden"}
            </span>
          </div>

          {/* Info grid */}
          <div className="rounded-2xl border border-[#E7A3B0]/15 bg-[#fffafc] p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoCell icon={<Tag className="h-3.5 w-3.5" />} label="Category" value={getCategoryName(product.category_id)} />
              <InfoCell
                icon={<CalendarRange className="h-3.5 w-3.5" />}
                label="Season"
                value={
                  season
                    ? `${season.name} (${formatSeasonWindow(season)})${season.isActive === false ? " \u2022 inactive" : ""}`
                    : "-"
                }
                ribbon={
                  season
                    ? (() => {
                        const tone = getSeasonColor(season.id, seasons, null);
                        return { borderColor: tone.border, trackColor: tone.bg };
                      })()
                    : undefined
                }
              />
              <InfoCell label="Brand" value={product.product_brand || "-"} />
              <InfoCell label="Condition" value={product.product_condition || "-"} />
              <InfoCell icon={<Ruler className="h-3.5 w-3.5" />} label="Size" value={product.size_label || "-"} />
              <InfoCell label="Stock" value={String(product.product_stock)} highlight={product.product_stock < 10 ? "warning" : undefined} />
              <InfoCell label="Product ID" value={product.product_id} mono />
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-2xl border border-[#E7A3B0]/15 bg-[#fffafc] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b47c88] mb-3">Pricing</p>
            <div className="flex items-baseline gap-3">
              {product.discountedPrice !== null && product.discountedPrice !== undefined ? (
                <>
                  <span className="text-2xl font-bold text-[#b96d7d]">&#8369;{product.discountedPrice.toFixed(2)}</span>
                  <span className="text-base text-gray-400 line-through">&#8369;{product.product_price.toFixed(2)}</span>
                </>
              ) : (
                <span className="text-2xl font-bold text-gray-900">&#8369;{product.product_price.toFixed(2)}</span>
              )}
            </div>
            {product.discount && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#E7A3B0]/20 bg-white px-3 py-2">
                <BadgePercent className="h-4 w-4 text-[#E7A3B0]" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{product.discount.discount_name}</p>
                  <p className="text-xs text-gray-500">
                    {product.discount.discount_type === "percent"
                      ? `${product.discount.discount_value}% off`
                      : product.discount.discount_type === "fixed_price"
                        ? `Final price \u20B1${product.discount.discount_value.toFixed(2)}`
                        : `\u20B1${product.discount.discount_value.toFixed(2)} off`}
                    {product.discount.ends_at ? ` \u2022 Ends ${new Date(product.discount.ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {product.product_description && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b47c88] mb-2">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">{product.product_description}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex items-center gap-4 text-xs text-gray-400 border-t border-gray-100 pt-4">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Created {formatDate(product.created_at)}
            </span>
            {lastUpdated && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Updated {formatDate(lastUpdated)}
              </span>
            )}
            {product.archived_at && (
              <span className="inline-flex items-center gap-1.5 text-amber-500">
                Archived {formatDate(product.archived_at)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCell({
  icon,
  label,
  value,
  highlight,
  mono,
  ribbon,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  highlight?: "warning";
  mono?: boolean;
  ribbon?: { borderColor: string; trackColor: string };
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p
        className={`text-sm font-semibold break-words [overflow-wrap:anywhere] ${highlight === "warning" ? "text-orange-600" : "text-gray-900"} ${mono ? "font-mono text-xs" : ""} ${ribbon ? "border-l-[3px] pl-2 py-0.5 -ml-0.5" : ""}`}
        style={
          ribbon
            ? {
                borderLeftColor: ribbon.borderColor,
                background: `linear-gradient(90deg, ${ribbon.trackColor} 0%, transparent 80%)`,
              }
            : undefined
        }
      >
        {value}
        {highlight === "warning" && <span className="ml-1.5 text-[10px] font-medium text-orange-500">Low</span>}
      </p>
    </div>
  );
}
